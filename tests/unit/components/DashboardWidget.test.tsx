import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardWidget, DashboardWidgetSkeleton } from '../../../components/Monitor/DashboardWidget';
import { Activity } from 'lucide-react';

describe('DashboardWidget', () => {
  describe('Rendering', () => {
    it('should render title', () => {
      render(<DashboardWidget title="Test Widget" />);
      expect(screen.getByText('Test Widget')).toBeInTheDocument();
    });

    it('should render subtitle when provided', () => {
      render(<DashboardWidget title="Test Widget" subtitle="Test subtitle" />);
      expect(screen.getByText('Test subtitle')).toBeInTheDocument();
    });

    it('should render value and label', () => {
      render(
        <DashboardWidget
          title="Test Widget"
          value={1234}
          valueLabel="executions"
        />
      );
      expect(screen.getByText('1234')).toBeInTheDocument();
      expect(screen.getByText('executions')).toBeInTheDocument();
    });

    it('should render icon when provided', () => {
      render(
        <DashboardWidget
          title="Test Widget"
          icon={<Activity data-testid="test-icon" />}
        />
      );
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('should render children when provided', () => {
      render(
        <DashboardWidget title="Test Widget">
          <div data-testid="child-content">Child content</div>
        </DashboardWidget>
      );
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });
  });

  describe('Trend Display', () => {
    it('should render trend with up direction', () => {
      render(
        <DashboardWidget
          title="Test Widget"
          value={100}
          trend={{
            direction: 'up',
            percentage: 12.5,
            period: 'vs last month',
          }}
        />
      );
      expect(screen.getByText(/12.5%/)).toBeInTheDocument();
      expect(screen.getByText('vs last month')).toBeInTheDocument();
    });

    it('should render trend with down direction', () => {
      render(
        <DashboardWidget
          title="Test Widget"
          value={100}
          trend={{
            direction: 'down',
            percentage: 5.0,
            period: 'improvement',
          }}
        />
      );
      expect(screen.getByText(/5.0%/)).toBeInTheDocument();
    });

    it('should render trend with neutral direction', () => {
      render(
        <DashboardWidget
          title="Test Widget"
          value={100}
          trend={{
            direction: 'neutral',
            percentage: 0,
            period: 'stable',
          }}
        />
      );
      expect(screen.getByText('stable')).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('should render loading state', () => {
      render(<DashboardWidget title="Test Widget" loading />);
      // Check for spinner (animated element)
      const spinner = screen.getByRole('region', { name: 'Test Widget' }).querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should render error state', () => {
      render(
        <DashboardWidget
          title="Test Widget"
          error="Something went wrong"
        />
      );
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should not render value when loading', () => {
      render(
        <DashboardWidget
          title="Test Widget"
          value={100}
          loading
        />
      );
      expect(screen.queryByText('100')).not.toBeInTheDocument();
    });

    it('should not render value when error', () => {
      render(
        <DashboardWidget
          title="Test Widget"
          value={100}
          error="Error message"
        />
      );
      expect(screen.queryByText('100')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper role and aria-label', () => {
      render(<DashboardWidget title="Test Widget" />);
      const region = screen.getByRole('region', { name: 'Test Widget' });
      expect(region).toBeInTheDocument();
    });

    it('should format numbers with proper separators for readability', () => {
      render(
        <DashboardWidget
          title="Test Widget"
          value={1000000}
        />
      );
      expect(screen.getByText('1,000,000')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should accept custom className', () => {
      const { container } = render(
        <DashboardWidget
          title="Test Widget"
          className="custom-class"
        />
      );
      const widget = container.querySelector('.custom-class');
      expect(widget).toBeInTheDocument();
    });

    it('should have base styles applied', () => {
      const { container } = render(<DashboardWidget title="Test Widget" />);
      const widget = container.firstChild;
      expect(widget).toHaveClass('bg-white', 'rounded-lg', 'border');
    });
  });

  describe('DashboardWidgetSkeleton', () => {
    it('should render single skeleton by default', () => {
      const { container } = render(<DashboardWidgetSkeleton />);
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render multiple skeletons when count specified', () => {
      const { container } = render(<DashboardWidgetSkeleton count={3} />);
      const widgetDivs = container.querySelectorAll('.rounded-lg.border');
      expect(widgetDivs.length).toBe(3);
    });

    it('should have loading animation', () => {
      const { container } = render(<DashboardWidgetSkeleton />);
      const animated = container.querySelector('.animate-pulse');
      expect(animated).toBeInTheDocument();
    });
  });

  describe('Value Formatting', () => {
    it('should format string values', () => {
      render(
        <DashboardWidget
          title="Test Widget"
          value="Active"
          valueLabel="status"
        />
      );
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should format numeric values with locale', () => {
      render(
        <DashboardWidget
          title="Test Widget"
          value={1234567}
          valueLabel="calls"
        />
      );
      expect(screen.getByText('1,234,567')).toBeInTheDocument();
    });

    it('should handle zero values', () => {
      render(
        <DashboardWidget
          title="Test Widget"
          value={0}
          valueLabel="errors"
        />
      );
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });
});
