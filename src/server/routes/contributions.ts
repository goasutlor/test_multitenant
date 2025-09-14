import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { dbQuery, dbQueryOne, dbExecute } from '../database/init';
import { authenticateToken, requireUser, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/errorHandler';
import { CreateContributionRequest, UpdateContributionRequest, Contribution } from '../types';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

const parseJsonArraySafe = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
};

// Validation for creating contributions
const createContributionValidation = [
  body('accountName').trim().isLength({ min: 1 }).withMessage('Account name is required'),
  body('saleName').trim().isLength({ min: 1 }).withMessage('Sale name is required'),
  body('saleEmail').isEmail().normalizeEmail().withMessage('Valid sale email is required'),
  body('contributionType').isIn(['technical', 'business', 'relationship', 'innovation', 'other']).withMessage('Valid contribution type is required'),
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
  body('impact').isIn(['low', 'medium', 'high', 'critical']).withMessage('Valid impact level is required'),
  body('effort').isIn(['low', 'medium', 'high']).withMessage('Valid effort level is required'),
  body('estimatedImpactValue').optional().isNumeric().withMessage('Estimated impact value must be a number'),
  body('contributionMonth').isLength({ min: 7 }).withMessage('Valid contribution month is required (YYYY-MM)'),
  body('status').optional().isIn(['draft', 'submitted']).withMessage('Valid status is required'),
  body('tags').isArray().withMessage('Tags must be an array')
];

// Validation for updating contributions
const updateContributionValidation = [
  body('accountName').optional().trim().isLength({ min: 1 }).withMessage('Account name is required'),
  body('saleName').optional().trim().isLength({ min: 1 }).withMessage('Sale name is required'),
  body('saleEmail').optional().isEmail().normalizeEmail().withMessage('Valid sale email is required'),
  body('contributionType').optional().isIn(['technical', 'business', 'relationship', 'innovation', 'other']).withMessage('Valid contribution type is required'),
  body('title').optional().trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('description').optional().trim().isLength({ min: 1 }).withMessage('Description is required'),
  body('impact').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Valid impact level is required'),
  body('effort').optional().isIn(['low', 'medium', 'high']).withMessage('Valid effort level is required'),
  body('estimatedImpactValue').optional().isNumeric().withMessage('Estimated impact value must be a number'),
  body('contributionMonth').optional().isLength({ min: 7 }).withMessage('Valid contribution month is required (YYYY-MM)'),
  body('status').optional().isIn(['draft', 'submitted']).withMessage('Valid status is required'),
  body('tags').optional().isArray().withMessage('Tags must be an array')
];

// Get all contributions for current user (or all for admin)
router.get('/', requireUser, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';
  const tenantId = (req as any).tenantId || 'tenant-default';
  
  // Build query based on user role
  let query = `
    SELECT c.*, u.fullName as userName 
    FROM contributions c 
    JOIN users u ON c.userId = u.id 
  `;
  let params: any[] = [];
  const conditions: string[] = [];
  conditions.push('c.tenantId = ?');
  params.push(tenantId);
  
  if (!isAdmin) {
    conditions.push('c.userId = ?');
    params.push(userId);
  }
  if (conditions.length) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY c.createdAt DESC';
  const rows = await dbQuery(query, params);

  const contributions = rows.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      accountName: row.accountName,
      saleName: row.saleName,
      saleEmail: row.saleEmail,
      contributionType: row.contributionType,
      title: row.title,
      description: row.description,
      impact: row.impact,
      effort: row.effort,
      estimatedImpactValue: row.estimatedImpactValue || 0,
      contributionMonth: row.contributionMonth,
      status: row.status,
      saleApproval: Boolean(row.saleApproval),
      saleApprovalDate: row.saleApprovalDate,
      saleApprovalNotes: row.saleApprovalNotes,
      attachments: parseJsonArraySafe(row.attachments),
      tags: parseJsonArraySafe(row.tags),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));

  res.json({ success: true, data: contributions });
}));

// Get all contributions (admin view)
router.get('/admin', requireUser, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') {
    throw createError('Admin access required', 403);
  }

  const tenantId = (req as any).tenantId || 'tenant-default';
  const rows = await dbQuery(`
    SELECT c.*, u.fullName as userName 
    FROM contributions c 
    JOIN users u ON c.userId = u.id 
    WHERE c.tenantId = ?
    ORDER BY c.createdAt DESC
  `, [tenantId]);

  const contributions = rows.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      accountName: row.accountName,
      saleName: row.saleName,
      saleEmail: row.saleEmail,
      contributionType: row.contributionType,
      title: row.title,
      description: row.description,
      impact: row.impact,
      effort: row.effort,
      estimatedImpactValue: row.estimatedImpactValue || 0,
      contributionMonth: row.contributionMonth,
      status: row.status,
      saleApproval: Boolean(row.saleApproval),
      saleApprovalDate: row.saleApprovalDate,
      saleApprovalNotes: row.saleApprovalNotes,
      attachments: parseJsonArraySafe(row.attachments),
      tags: parseJsonArraySafe(row.tags),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
  }));

  res.json({ success: true, data: contributions });
}));

// Get contribution by ID
router.get('/:id', requireUser, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const tenantId = (req as any).tenantId || 'tenant-default';

  const row = await dbQueryOne(`
    SELECT c.*, u.fullName as userName 
    FROM contributions c 
    JOIN users u ON c.userId = u.id 
    WHERE c.id = ? AND c.tenantId = ?
  `, [id, tenantId]);

  if (!row) throw createError('Contribution not found', 404);
  if (req.user!.role !== 'admin' && row.userId !== userId) throw createError('Access denied', 403);

  const contribution = {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    accountName: row.accountName,
    saleName: row.saleName,
    saleEmail: row.saleEmail,
    contributionType: row.contributionType,
    title: row.title,
    description: row.description,
    impact: row.impact,
    effort: row.effort,
    estimatedImpactValue: row.estimatedImpactValue || 0,
    contributionMonth: row.contributionMonth,
    status: row.status,
    saleApproval: Boolean(row.saleApproval),
    saleApprovalDate: row.saleApprovalDate,
    saleApprovalNotes: row.saleApprovalNotes,
    attachments: parseJsonArraySafe(row.attachments),
    tags: parseJsonArraySafe(row.tags),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };

  res.json({ success: true, data: contribution });
}));

// Create new contribution
router.post('/', requireUser, createContributionValidation, asyncHandler(async (req: AuthRequest, res: Response) => {
  console.log('🔍 Create Contribution Request Body:', req.body);
  console.log('🔍 Create Contribution Status:', req.body.status);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    throw createError('Validation failed', 400);
  }
  
  console.log('✅ Validation passed, status:', req.body.status);

  const contributionData: CreateContributionRequest = req.body;
  console.log('🔍 ContributionData after assignment:', contributionData);
  console.log('🔍 ContributionData.status:', contributionData.status);
  
  const userId = req.user!.id;
  const tenantId = (req as any).tenantId || 'tenant-default';

  // Validate contribution month format (YYYY-MM)
  if (!/^\d{4}-\d{2}$/.test(contributionData.contributionMonth)) {
    throw createError('Invalid contribution month format. Use YYYY-MM', 400);
  }

  // Debug user data
  console.log('🔍 Create Contribution - User Data:', {
    userId: req.user!.id,
    involvedAccountNames: req.user!.involvedAccountNames,
    involvedSaleNames: req.user!.involvedSaleNames,
    involvedSaleEmails: req.user!.involvedSaleEmails
  });
  console.log('🔍 Create Contribution - Request Data:', contributionData);

  // Validate that account and sale are in user's allowed list
  if (!req.user!.involvedAccountNames.includes(contributionData.accountName)) {
    console.log('❌ Account validation failed:', {
      userAccounts: req.user!.involvedAccountNames,
      requestedAccount: contributionData.accountName
    });
    throw createError('Account not in your allowed list', 400);
  }

  if (!req.user!.involvedSaleNames.includes(contributionData.saleName)) {
    console.log('❌ Sale validation failed:', {
      userSales: req.user!.involvedSaleNames,
      requestedSale: contributionData.saleName
    });
    throw createError('Sale not in your allowed list', 400);
  }

  const contributionId = uuidv4();
  const finalStatus = contributionData.status === 'draft' ? 'draft' : 'submitted';
  
  console.log('🔍 Create Contribution - Status Debug:', {
    receivedStatus: contributionData.status,
    finalStatus: finalStatus,
    isDraft: contributionData.status === 'draft',
    fullContributionData: contributionData
  });
  
  await dbExecute(`
    INSERT INTO contributions (
      id, tenantId, userId, accountName, saleName, saleEmail, contributionType, 
      title, description, impact, effort, estimatedImpactValue, contributionMonth, 
      status, tags, attachments
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    contributionId,
    tenantId,
    userId,
    contributionData.accountName,
    contributionData.saleName,
    contributionData.saleEmail,
    contributionData.contributionType,
    contributionData.title,
    contributionData.description,
    contributionData.impact,
    contributionData.effort,
    contributionData.estimatedImpactValue || 0,
    contributionData.contributionMonth,
    finalStatus,
    JSON.stringify(contributionData.tags),
    JSON.stringify([])
  ]);

  res.status(201).json({ success: true, message: 'Contribution created successfully', data: { id: contributionId } });
}));

// Update contribution
router.put('/:id', requireUser, updateContributionValidation, asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }

  const { id } = req.params;
  const updateData: UpdateContributionRequest = req.body;
  const userId = req.user!.id;

  // Check if contribution exists and user can edit it
  const row = await dbQueryOne('SELECT * FROM contributions WHERE id = ?', [id]);
  if (!row) throw createError('Contribution not found', 404);
  if (req.user!.role !== 'admin' && row.userId !== userId) throw createError('Access denied', 403);

    // Validate contribution month format if being updated
    if (updateData.contributionMonth && !/^\d{4}-\d{2}$/.test(updateData.contributionMonth)) {
      throw createError('Invalid contribution month format. Use YYYY-MM', 400);
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (updateData.accountName !== undefined) {
      updateFields.push('accountName = ?');
      updateValues.push(updateData.accountName);
    }

    if (updateData.saleName !== undefined) {
      updateFields.push('saleName = ?');
      updateValues.push(updateData.saleName);
    }

    if (updateData.saleEmail !== undefined) {
      updateFields.push('saleEmail = ?');
      updateValues.push(updateData.saleEmail);
    }

    if (updateData.contributionType !== undefined) {
      updateFields.push('contributionType = ?');
      updateValues.push(updateData.contributionType);
    }

    if (updateData.title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(updateData.title);
    }

    if (updateData.description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(updateData.description);
    }

    if (updateData.impact !== undefined) {
      updateFields.push('impact = ?');
      updateValues.push(updateData.impact);
    }

    if (updateData.effort !== undefined) {
      updateFields.push('effort = ?');
      updateValues.push(updateData.effort);
    }

    if (updateData.contributionMonth !== undefined) {
      updateFields.push('contributionMonth = ?');
      updateValues.push(updateData.contributionMonth);
    }

    if (updateData.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(updateData.status);
    }

    if (updateData.tags !== undefined) {
      updateFields.push('tags = ?');
      updateValues.push(JSON.stringify(updateData.tags));
    }

    if (updateFields.length === 0) {
      throw createError('No fields to update', 400);
    }

    updateFields.push('updatedAt = CURRENT_TIMESTAMP');
    updateValues.push(id);

    const updateQuery = `UPDATE contributions SET ${updateFields.join(', ')} WHERE id = ?`;
    await dbExecute(updateQuery, updateValues);
    res.json({ success: true, message: 'Contribution updated successfully' });
}));

// Delete contribution
router.delete('/:id', requireUser, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Check if contribution exists and user can delete it
  const row = await dbQueryOne('SELECT * FROM contributions WHERE id = ?', [id]);
  if (!row) throw createError('Contribution not found', 404);
  if (req.user!.role !== 'admin' && row.userId !== userId) throw createError('Access denied', 403);
  if (row.status !== 'draft' && req.user!.role !== 'admin') throw createError('Only draft contributions can be deleted', 400);
  await dbExecute('DELETE FROM contributions WHERE id = ?', [id]);
  res.json({ success: true, message: 'Contribution deleted successfully' });
}));

// Submit contribution for approval
router.post('/:id/submit', requireUser, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Check if contribution exists and user can submit it
  const row = await dbQueryOne('SELECT * FROM contributions WHERE id = ?', [id]);
  if (!row) throw createError('Contribution not found', 404);
  if (req.user!.role !== 'admin' && row.userId !== userId) throw createError('Access denied', 403);
  if (row.status !== 'draft') throw createError('Only draft contributions can be submitted', 400);
  await dbExecute('UPDATE contributions SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', ['submitted', id]);
  res.json({ success: true, message: 'Contribution submitted successfully' });
}));

export { router as contributionRoutes };
