import { Request, Response } from 'express';
import { Project } from '../models/Project.Model';
import { z } from 'zod';
import { authenticateToken } from '../middleware/Authentication';
import  UserModel  from '../models/Users.Model';

// Simple structure item schema
const structureItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["file", "folder"]),
    parentId: z.string().nullable(),
    content: z.string().optional(),
  });
  
// Project schema for validation
const projectSchema = z.object({
title: z.string().min(1, "Title is required"),
description: z.string().default(""),
tags: z.array(z.string()).optional(),
isPublic: z.boolean().default(false),
structure: z.array(structureItemSchema).default([]),
forkedFrom: z.string().optional(),
});

// For project updates
const updateProjectSchema = projectSchema.partial();

export const createProject = async (req: Request, res: Response) => {
    try {
        const { title, description, tags, isPublic, structure, forkedFrom } = projectSchema.parse(req.body);
        const userId = req.user._id; 

        const newProject = new Project({
            ownerId: userId,
            title,
            description,
            tags,
            isPublic,
            structure,
            forkedFrom,
        });

        await newProject.save();
        return res.status(201).json({ message: 'Project created successfully', project: newProject });
    }catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}


export const getProject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const project = await Project.findById(id).populate('ownerId', 'username email');
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        return res.status(200).json({ project });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const updateProject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = updateProjectSchema.parse(req.body);
        const userId = req.user._id;

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        Object.assign(project, updates);

        await project.save();
        return res.status(200).json({ message: 'Project updated successfully', project });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const DeleteProject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        await Project.deleteOne({ _id: project._id });
        return res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const getUserProjects = async (req: Request, res: Response) => {
    try {
        const userId = req.user._id; 
        const projects = await Project.find({ ownerId: userId }).populate('ownerId', 'username email');
        return res.status(200).json({ projects });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
}