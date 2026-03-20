/**
 * Centralized email notification helper.
 *
 * Sends a POST request to the backend `/api/notify` endpoint
 * whenever a form submission needs to trigger an email notification.
 *
 * Usage:
 *   await sendNotification({
 *     type: 'contact',            // 'contact' | 'program' | 'volunteer'
 *     name: 'John Doe',
 *     email: 'john@example.com',
 *     message: 'Details here...',
 *   });
 */

const NOTIFY_URL = `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/notify`;

/**
 * @param {{ type: string, name: string, email: string, message: string }} payload
 * @returns {Promise<object>}
 */
export async function sendNotification(payload) {
  const response = await fetch(NOTIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Notification request failed');
  }

  return data;
}
