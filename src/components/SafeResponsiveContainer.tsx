import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ResponsiveContainer as RechartsResponsiveContainer,
  type ResponsiveContainerProps,
} from 'recharts';

type SafeResponsiveContainerProps = Omit<ResponsiveContainerProps, 'children'> & {
  children: ReactNode;
};

export function SafeResponsiveContainer({
  children,
  style,
  className,
  id,
  initialDimension = { width: 1, height: 1 },
  ...props
}: SafeResponsiveContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasSize, setHasSize] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const { width, height } = container.getBoundingClientRect();
      setHasSize(width > 0 && height > 0);
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={typeof className === 'string' ? className : undefined}
      id={typeof id === 'string' ? id : undefined}
      style={{
        width: '100%',
        height: '100%',
        ...style,
      }}
    >
      {hasSize && (
        <RechartsResponsiveContainer
          {...props}
          initialDimension={initialDimension}
        >
          {children}
        </RechartsResponsiveContainer>
      )}
    </div>
  );
}
