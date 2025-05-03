import { Request, Response } from 'express';
import { userService } from '../services/UserService';
import { generateToken } from '../utils/jwt';
import { formatChips, parseChips } from '../utils/chip';

/**
 * Get all users
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * Get a user by ID
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

/**
 * Create a new user
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    
    // Check if user already exists
    const existingUser = await userService.getUserByName(name);
    
    if (existingUser) {
      res.status(400).json({ error: 'User with this name already exists' });
      return;
    }
    
    const user = await userService.findOrCreateUser(name);
    
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

/**
 * Update a user's chip count
 */
export const updateUserChips = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { chips } = req.body;
    
    // Handle different chip input formats
    let chipValue: number;
    
    if (typeof chips === 'string') {
      // Handle string input (e.g. "3M" or "3000000")
      chipValue = parseChips(chips);
    } else if (typeof chips === 'number') {
      // Handle number input
      chipValue = chips;
    } else if (typeof chips === 'object' && chips !== null) {
      // Handle object format like { short: "3M", full: "3,000,000" }
      // Use the full value if available, otherwise try short
      if (chips.full) {
        // Remove commas from the full representation
        const fullWithoutCommas = chips.full.replace(/,/g, '');
        chipValue = parseChips(fullWithoutCommas);
      } else if (chips.short) {
        chipValue = parseChips(chips.short);
      } else if (chips.raw) {
        chipValue = Number(chips.raw);
      } else {
        throw new Error('Invalid chip format: missing valid property');
      }
    } else {
      throw new Error('Invalid chip format');
    }
    
    const user = await userService.updateUserChips(id, chipValue);
    
    res.json({
      ...user,
      chips: formatChips(user.chips)
    });
  } catch (error) {
    console.error('Error updating user chips:', error);
    res.status(500).json({ error: 'Failed to update user chips' });
  }
};

/**
 * Delete a user
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    await userService.deleteUser(id);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

/**
 * Authenticate a user - creates if doesn't exist
 */
export const authenticateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    
    // Find or create the user
    const user = await userService.findOrCreateUser(name);
    
    // Generate JWT token
    const token = generateToken(user.id, user.name);
    
    console.log('User authenticated:', user);
    res.json({ 
      token,
      user: {
        id: user.id,
        name: user.name,
        chips: formatChips(user.chips)
      }
    });
  } catch (error) {
    console.error('Error authenticating user:', error);
    res.status(500).json({ error: 'Failed to authenticate user' });
  }
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const user = await userService.getUserById(req.user.userId);
    
    if (!user) {
      res.status(400).json({ error: 'User not found' });
      return;
    }
    
    res.json({
      id: user.id,
      name: user.name,
      chips: formatChips(user.chips)
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}; 