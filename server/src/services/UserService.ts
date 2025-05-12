import prisma from "./prisma.js";


export class UserService {
  /**
   * Find or create a user by name
   */
  async findOrCreateUser(name: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { name }
    });
    
    if (user) {
      return user;
    }
    
    return prisma.user.create({
      data: { name }
    });
  }

  /**
   * Get a user by ID
   */
  async getUserById(id: string): Promise<any> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<any[]> {
    return prisma.user.findMany();
  }

  /**
   * Get a user by name
   */
  async getUserByName(name: string): Promise<any> {
    return prisma.user.findUnique({
      where: { name }
    });
  }


  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<any> {
    return prisma.user.delete({
      where: { id }
    });
  }
}

// Export a singleton instance
export const userService = new UserService(); 