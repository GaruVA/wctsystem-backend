import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, name, address } = req.body;
    const user = new User({ email, password, name, address });
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name, userType: user.userType } });
  } catch (error) {
    console.error(error);
    next(error); // Pass the error to the Express error handler
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    
    if (!user) {
      res.status(400).json({ message: 'User not found' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1d' });

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        email: user.email, 
        name: user.name, 
        userType: user.userType 
      } 
    });
  } catch (error) {
    console.error(error);
    next(error); // Pass the error to the Express error handler
  }
};
