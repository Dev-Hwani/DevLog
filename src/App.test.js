import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the DevLog brand', () => {
  render(<App />);
  const brandElements = screen.getAllByText(/DevLog/i);
  expect(brandElements.length).toBeGreaterThan(0);
});
