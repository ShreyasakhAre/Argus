import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/notifications/:id
 * Delete a notification (no-op in dataset-driven mode)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // MongoDB disabled — return success without actual deletion
    return NextResponse.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('DELETE /api/notifications/:id error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
