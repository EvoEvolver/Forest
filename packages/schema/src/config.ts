const currentPort =
  (process.env.NODE_ENV || 'development') === 'development'
    ? '29999'
    : typeof window !== 'undefined'
      ? window.location.port
      : '';

export const httpUrl =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:${currentPort}`
    : null;