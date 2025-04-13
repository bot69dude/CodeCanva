import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import { createProject, getProject, updateProject, DeleteProject } from '../../../src/controllers/projectController';
import { Project } from '../../../src/models/Project.Model';
import { Types } from 'mongoose';
import { IUser } from '../../../src/models/Users.Model';

jest.mock('../../../src/models/Project.Model');

let mockRequest: Partial<Request>;
let mockResponse: Partial<Response>;
let responseObject: any = {};
let userId: Types.ObjectId;

beforeEach(() => {
  userId = new Types.ObjectId();

  // Create a complete mock user object that satisfies IUser interface.
  const mockUser: Partial<IUser> = {
    _id: userId,
    username: 'testuser',
    password: 'password123',
    email: 'test@example.com'
  };

  mockRequest = {
    params: { id: 'project123' },
    user: mockUser as IUser,
    body: {
      title: 'Test Project',
      description: 'A test project',
      tags: ['javascript', 'react'],
      isPublic: true,
      structure: [
        {
          id: 'root',
          name: 'root',
          type: 'folder',
          parentId: null
        }
      ]
    }
  };

  responseObject = {
    statusCode: 0,
    jsonData: {}
  };

  mockResponse = {
    status: jest.fn().mockImplementation((code) => {
      responseObject.statusCode = code;
      return mockResponse as unknown as Response;
    }) as unknown as Response['status'],
    json: jest.fn().mockImplementation((data) => {
      responseObject.jsonData = data;
      return mockResponse as unknown as Response;
    }) as unknown as Response['json']
  };
});

describe('Project Controller', () => {
  describe('createProject', () => {
    // Existing tests for createProject...
    it('should create project successfully', async () => {
      const mockProjectData = {
        _id: 'project123',
        ...mockRequest.body,
        ownerId: userId
      };

      const saveMock = jest.fn<() => Promise<typeof mockProjectData>>().mockResolvedValue(mockProjectData);
      (Project.prototype.save as jest.Mock) = saveMock;

      await createProject(mockRequest as Request, mockResponse as Response);

      expect(responseObject.statusCode).toBe(201);
      expect(responseObject.jsonData.message).toBe('Project created successfully');
    });

    it('should handle errors during project creation', async () => {
      const errorMessage = 'Database error';

      const saveMock = jest.fn<() => Promise<never>>().mockRejectedValue(new Error(errorMessage));
      (Project.prototype.save as any) = saveMock;

      await createProject(mockRequest as Request, mockResponse as Response);

      expect(responseObject.statusCode).toBe(500);
      expect(responseObject.jsonData.message).toContain('Internal server error');
    });
  });

  describe('getProject', () => {
    // Existing tests for getProject...
    it('should get project by id', async () => {
      const mockProjectData = {
        _id: 'project123',
        title: 'Test Project',
        ownerId: userId
      };

      const populateMock = jest.fn<() => Promise<typeof mockProjectData>>().mockResolvedValue(mockProjectData);
      (Project.findById as jest.Mock) = jest.fn().mockReturnValue({ populate: populateMock });

      await getProject(mockRequest as Request, mockResponse as Response);

      expect(responseObject.statusCode).toBe(200);
      expect(responseObject.jsonData.project).toEqual(mockProjectData);
    });

    it('should return 404 if project not found', async () => {
      const populateMock = jest.fn<() => Promise<null>>().mockResolvedValue(null);
      (Project.findById as jest.Mock) = jest.fn().mockReturnValue({ populate: populateMock });

      await getProject(mockRequest as Request, mockResponse as Response);

      expect(responseObject.statusCode).toBe(404);
      expect(responseObject.jsonData.message).toBe('Project not found');
    });
  });

  describe('updateProject', () => {
    it('should update project successfully', async () => {
      // Setup updated project data
      const updatedData = {
        title: 'Updated Project',
        description: 'Updated description',
        tags: ['updated', 'tags'],
        isPublic: false
      };
      mockRequest.body = updatedData;
      
      // Precompute the object that save() should resolve to.
      const resolvedProject: any = {
        _id: 'project123',
        ownerId: userId,
        ...updatedData
      };
      
      // Create a project object with a save method.
      const project = {
        _id: 'project123',
        ownerId: userId,
        ...mockRequest.body,
        // @ts-ignore
        save: jest.fn().mockResolvedValue(resolvedProject)
      };
      
      // Mock findById to directly return a Promise resolving to our project.
      // This mimics the controller calling: const project = await Project.findById(id);
      jest.spyOn(Project, 'findById').mockResolvedValue(project as any);
      
      await updateProject(mockRequest as Request, mockResponse as Response);
      
      expect(Project.findById).toHaveBeenCalledWith('project123');
      expect(project.save).toHaveBeenCalled();
      expect(responseObject.statusCode).toBe(200);
      expect(responseObject.jsonData.message).toBe('Project updated successfully');
      expect(responseObject.jsonData.project.title).toBe('Updated Project');
    });
    
    it('should return 404 if project not found for update', async () => {
      // Mock findById to directly return null (project not found)
      jest.spyOn(Project, 'findById').mockResolvedValue(null);
      
      await updateProject(mockRequest as Request, mockResponse as Response);
      
      expect(Project.findById).toHaveBeenCalledWith('project123');
      expect(responseObject.statusCode).toBe(404);
      expect(responseObject.jsonData.message).toBe('Project not found');
    });
  });
  
  describe('DeleteProject', () => {
    it('should delete project successfully', async () => {
      const project = {
        _id: 'project123',
        ownerId: userId,
        title: 'Test Project'
      };

      // Mock findById and deleteOne
      jest.spyOn(Project, 'findById').mockResolvedValue(project as any);
      jest.spyOn(Project, 'deleteOne').mockResolvedValue({ deletedCount: 1 } as any);

      await DeleteProject(mockRequest as Request, mockResponse as Response);

      expect(Project.findById).toHaveBeenCalledWith('project123');
      expect(Project.deleteOne).toHaveBeenCalledWith({ _id: 'project123' });
      expect(responseObject.statusCode).toBe(200);
      expect(responseObject.jsonData.message).toBe('Project deleted successfully');
    });

    it('should return 404 if project not found for deletion', async () => {
      // Mock findById to return null (project not found)
      jest.spyOn(Project, 'findById').mockResolvedValue(null);

      await DeleteProject(mockRequest as Request, mockResponse as Response);

      expect(Project.findById).toHaveBeenCalledWith('project123');
      expect(responseObject.statusCode).toBe(404);
      expect(responseObject.jsonData.message).toBe('Project not found');
    });

    it('should return 403 if user is not the owner', async () => {
      const differentUserId = new Types.ObjectId();
      const project = {
        _id: 'project123',
        ownerId: differentUserId, 
        title: 'Test Project'
      };

      // Mock findById to return the project with different owner
      jest.spyOn(Project, 'findById').mockResolvedValue(project as any);

      await DeleteProject(mockRequest as Request, mockResponse as Response);

      expect(Project.findById).toHaveBeenCalledWith('project123');
      expect(responseObject.statusCode).toBe(403);
      expect(responseObject.jsonData.message).toBe('Forbidden');
    });
  });
});