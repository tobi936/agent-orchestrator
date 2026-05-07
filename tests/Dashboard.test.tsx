import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '../apps/web/src/app/dashboard/page';

jest.mock('../apps/web/src/lib/api', () => ({
  api: {
    get: jest.fn().mockResolvedValue([1, 2]),
    post: jest.fn(),
  },
}));

test('renders dashboard title', async () => {
  render(<DashboardPage />);
  expect(screen.getByText(/Agent Dashboard/i)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText(/Agent #1/)).toBeInTheDocument());
});
