import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Input } from '../components/ui/Input';

describe('UI Component Library', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Button', () => {
    it('renders with children and handles clicks', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Start Mock</Button>);

      const btn = screen.getByRole('button', { name: /Start Mock/i });
      expect(btn).toBeInTheDocument();

      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('displays loading spinner when isLoading is true', () => {
      render(<Button isLoading>Submitting</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
    });
  });

  describe('Badge', () => {
    it('renders text with appropriate variant styles', () => {
      render(<Badge variant="success">Placement Ready</Badge>);
      expect(screen.getByText('Placement Ready')).toBeInTheDocument();
    });
  });

  describe('Card', () => {
    it('renders CardHeader, CardTitle, and CardContent', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Technical Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Score: 88%</p>
          </CardContent>
        </Card>
      );

      expect(screen.getByText('Technical Assessment')).toBeInTheDocument();
      expect(screen.getByText('Score: 88%')).toBeInTheDocument();
    });
  });

  describe('ProgressBar', () => {
    it('renders progress bar with correct aria values and percentage', () => {
      render(<ProgressBar value={75} max={100} label="Aptitude Progress" showValue />);
      expect(screen.getByText('Aptitude Progress')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '75');
    });
  });

  describe('Input', () => {
    it('renders input with label and helper or error message', () => {
      render(<Input label="College Email" error="Email is required" placeholder="test@college.edu" />);
      expect(screen.getByText('College Email')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    it('ties the label and error to the field even without an id or name', () => {
      render(<Input label="Event Title" error="Title is required" />);
      const field = screen.getByLabelText('Event Title');
      expect(field.tagName).toBe('INPUT');
      expect(field).toHaveAttribute('aria-invalid', 'true');
      expect(field).toHaveAccessibleDescription('Title is required');
    });
  });
});
