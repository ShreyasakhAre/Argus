const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const datasetService = require('./datasetService');

const ML_DIR = path.resolve(__dirname, '../ml');
const TRAIN_SCRIPT = path.join(ML_DIR, 'train_model.py');
const PREDICT_SCRIPT = path.join(ML_DIR, 'predict.py');
const MODEL_DIR = path.join(ML_DIR, 'models');

function getPythonCandidates() {
  return process.platform === 'win32'
    ? ['py', 'python', 'python3']
    : ['python3', 'python'];
}

function runPython(scriptPath, args = []) {
  return new Promise(async (resolve, reject) => {
    const candidates = getPythonCandidates();

    const tryExec = (index) => {
      if (index >= candidates.length) {
        return reject(new Error('No Python interpreter found for ML pipeline.'));
      }

      const cmd = candidates[index];
      const proc = spawn(cmd, [scriptPath, ...args], {
        cwd: ML_DIR,
        shell: false,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', () => {
        tryExec(index + 1);
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          if (index + 1 < candidates.length) {
            return tryExec(index + 1);
          }
          return reject(new Error(stderr || `Python process failed with code ${code}`));
        }
        resolve(stdout.trim());
      });
    };

    tryExec(0);
  });
}

function parseJsonOutput(output) {
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      return JSON.parse(lines[i]);
    } catch (_) {
      // keep searching for JSON line
    }
  }
  throw new Error(`Could not parse JSON from python output: ${output}`);
}

async function ensureModelArtifacts() {
  const required = [
    'text_model.pkl',
    'meta_model.pkl',
    'vectorizer.pkl',
    'meta_vectorizer.pkl',
  ].map((file) => path.join(MODEL_DIR, file));

  const missing = required.some((p) => !fs.existsSync(p));
  if (!missing) return;

  const output = await runPython(TRAIN_SCRIPT);
  const parsed = parseJsonOutput(output);
  if (!parsed.success) {
    throw new Error('Model training failed while bootstrapping artifacts.');
  }
}

function normalizePredictPayload(input = {}) {
  return {
    subject: input.subject || input.title || '',
    body: input.body || input.content || '',
    sender: input.sender || 'unknown@external.com',
    department: input.department || 'Unknown',
    links: input.links || (input.contains_url ? 1 : 0) || 0,
    attachments: input.attachments || input.attachment_type || 'none',
    channel: input.channel || 'Email',
    receiver: input.receiver || 'employee@company.com',
    timestamp: input.timestamp || new Date().toISOString(),
  };
}

async function predict(payload = {}) {
  await ensureModelArtifacts();
  const normalized = normalizePredictPayload(payload);

  const output = await runPython(PREDICT_SCRIPT, ['--input', JSON.stringify(normalized)]);
  const parsed = parseJsonOutput(output);
  if (!parsed.success) {
    throw new Error('Prediction failed in python pipeline.');
  }

  return parsed.data;
}

function decisionToFeedback(record) {
  if (record.review_status === 'Approved') {
    return {
      notification_id: record.notification_id,
      decision: 'approved',
      corrected_label: 'safe',
    };
  }
  if (record.review_status === 'Rejected') {
    return {
      notification_id: record.notification_id,
      decision: 'rejected',
      corrected_label: 'phishing',
    };
  }
  if (record.review_status === 'Escalated') {
    return {
      notification_id: record.notification_id,
      decision: 'escalated',
      corrected_label: 'suspicious',
    };
  }
  return null;
}

async function retrain() {
  const { data } = datasetService.query({}, { page: 1, limit: 10000, internal: true });
  const reviewed = data
    .filter((item) => item.review_status && item.review_status !== 'Pending')
    .map(decisionToFeedback)
    .filter(Boolean);

  let tempFeedbackPath = null;
  const args = [];

  if (reviewed.length > 0) {
    tempFeedbackPath = path.join(ML_DIR, `feedback_${Date.now()}.json`);
    fs.writeFileSync(tempFeedbackPath, JSON.stringify(reviewed, null, 2), 'utf-8');
    args.push('--feedback-json', tempFeedbackPath);
  }

  try {
    const output = await runPython(TRAIN_SCRIPT, args);
    const parsed = parseJsonOutput(output);
    if (!parsed.success) {
      throw new Error('Retrain failed in python pipeline.');
    }
    return parsed.metrics;
  } finally {
    if (tempFeedbackPath && fs.existsSync(tempFeedbackPath)) {
      fs.unlinkSync(tempFeedbackPath);
    }
  }
}

function getMetrics() {
  const metricsPath = path.join(MODEL_DIR, 'metrics.json');
  if (!fs.existsSync(metricsPath)) return null;
  return JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
}

module.exports = {
  predict,
  retrain,
  ensureModelArtifacts,
  getMetrics,
};
