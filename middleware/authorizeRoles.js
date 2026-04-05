const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          message: "Forbidden: You don't have permission",
        });
      }

      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
};

module.exports = { authorizeRoles };
