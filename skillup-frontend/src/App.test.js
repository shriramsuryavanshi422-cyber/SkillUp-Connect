import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    const route = typeof url === 'string' ? url : url.url;

    const payloadMap = {
      '/api/health': { mode: 'local' },
      '/api/workshops': [],
      '/api/events': [],
      '/api/impact-stats': {
        workshopsPublished: 3,
        volunteersJoined: 8,
        donationsRaised: 12000,
        messagesReceived: 4,
        estimatedLivesTouched: 145,
      },
      '/api/testimonials': [
        { id: 1, name: 'Aarav Mehta', role: 'Volunteer Mentor', quote: 'Helpful and clear.' },
      ],
    };

    const payload = payloadMap[route] ?? [];

    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(payload)),
    });
  });

  window.IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders the platform homepage', async () => {
  render(<App />);

  expect(
    screen.getByRole('heading', {
      name: /helping people build a better future/i,
    })
  ).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText(/search the current lineup/i)).toBeInTheDocument();
  });
});
