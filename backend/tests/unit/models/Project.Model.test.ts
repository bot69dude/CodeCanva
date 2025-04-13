import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Project } from '../../../src/models/Project.Model';
import mongoose from 'mongoose';

describe('Project Model', () => {
  const mockUserId = new mongoose.Types.ObjectId();

  const validProject = {
    title: "My New Project",
    description: "This is a sample project description",
    tags: ["javascript", "react", "typescript"],
    isPublic: true,
    ownerId: mockUserId,
    structure: [
      {
        id: "root",
        name: "root",
        type: "folder",
        parentId: null
      },
      {
        id: "file1",
        name: "index.js",
        type: "file",
        parentId: "root",
        content: "console.log('Hello world');"
      },
      {
        id: "folder1",
        name: "src",
        type: "folder",
        parentId: "root"
      },
      {
        id: "file2",
        name: "app.js",
        type: "file",
        parentId: "folder1",
        content: "import React from 'react';\n\nfunction App() {\n  return <div>Hello React</div>;\n}\n\nexport default App;"
      }
    ]
  };

  it('should create a valid project', async () => {
    const project = new Project(validProject);
    const savedProject = await project.save();
    
    expect(savedProject._id).toBeDefined();
    expect(savedProject.title).toBe(validProject.title);
    expect(savedProject.description).toBe(validProject.description);
    expect(savedProject.isPublic).toBe(validProject.isPublic);
    expect(savedProject.tags).toEqual(expect.arrayContaining(validProject.tags));
    expect(savedProject.ownerId).toEqual(mockUserId);
  });

  it('should fail validation without required title', async () => {
    const project = new Project({
      ...validProject,
      title: undefined
    });
    
    let error: mongoose.Error.ValidationError | undefined;
    try {
      await project.validate();
    } catch (e) {
      error = e as mongoose.Error.ValidationError;
    }
    
    expect(error).toBeDefined();
    expect(error!.errors.title).toBeDefined();
  });

  it('should fail validation without ownerId', async () => {
    const projectWithoutOwner = {
      ...validProject,
      ownerId: undefined
    };
    
    const project = new Project(projectWithoutOwner);
    
    let error: mongoose.Error.ValidationError | undefined;
    try {
      await project.validate();
    } catch (e) {
      error = e as mongoose.Error.ValidationError;
    }
    
    expect(error).toBeDefined();
    expect(error!.errors.ownerId).toBeDefined();
  });

  it('should validate project structure items', async () => {
    const project = new Project(validProject);
    await project.save();
    
    const fileItem = project.structure.find(item => item.id === 'file1');
    
    expect(fileItem).toBeDefined();
    expect(fileItem?.name).toBe('index.js');
    expect(fileItem?.type).toBe('file');
    expect(fileItem?.parentId).toBe('root');
    expect(fileItem?.content).toBe("console.log('Hello world');");
  });

  it('should update project structure', async () => {
    const project = new Project(validProject);
    await project.save();
    
    project.structure.push({
      id: 'file3',
      name: 'styles.css',
      type: 'file',
      parentId: 'root',
      content: 'body { margin: 0; }'
    });
    
    await project.save();
    
    const updatedProject = await Project.findById(project._id);
    // Original 4 structure items + 1 new = 5
    expect(updatedProject?.structure.length).toBe(5);
    
    const newFile = updatedProject?.structure.find(item => item.id === 'file3');
    expect(newFile?.name).toBe('styles.css');
  });
});