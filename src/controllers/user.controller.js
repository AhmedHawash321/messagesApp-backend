export const profile = async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({ message: "user found", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
