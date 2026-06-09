import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. No session token provided.' });
  }

  const secret = process.env.JWT_SECRET || 'super_secret_cryptographic_nexus_key_987654321';

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Session session expired or signature corrupted.' });
    }
    req.user = decoded;
    next();
  });
};

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized permission level for this operations module.' });
    }
    next();
  };
};
