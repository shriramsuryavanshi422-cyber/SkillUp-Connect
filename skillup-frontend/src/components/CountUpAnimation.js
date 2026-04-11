import React, { useEffect, useRef, useState } from 'react';

const CountUpAnimation = ({ end, target, duration = 1400, suffix = '', prefix = '' }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);
  
  const finalValue = Number(end ?? target ?? 0);

  useEffect(() => {
    const currentElement = elementRef.current;
    if (!currentElement) {
      return undefined;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.2 });

    observer.observe(currentElement);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    if (!Number.isFinite(finalValue) || finalValue <= 0) {
      setCount(0);
      return undefined;
    }

    let frameId;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(finalValue * easedProgress));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [duration, finalValue, isVisible]);

  return (
    <span ref={elementRef} className="count-up-wrapper">
      {prefix}
      {new Intl.NumberFormat().format(count)}
      {suffix}
    </span>
  );
};

export default CountUpAnimation;
