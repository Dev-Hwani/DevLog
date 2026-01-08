import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the velog brand', () => {
  render(<App />);
  const brandElements = screen.getAllByText(/velog/i);
  expect(brandElements.length).toBeGreaterThan(0);
});
