import { Express } from 'express';
import { operatorActionsService } from '../../domain/operators/operatorActionsService';
import { asyncHandler, ValidationError } from '../../app/errorHandling';

export function setupOperatorRoutes(app: Express) {
  app.post('/api/incidents/:id/resolve', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason, operatorId } = req.body;
    
    const validation = operatorActionsService.validateAction('resolve', id);
    if (!validation.valid) {
      throw new ValidationError(validation.reason || 'Invalid action');
    }

    const action = operatorActionsService.executeAction({
      incidentId: id,
      actionType: 'resolve',
      operatorId,
      payload: { reason }
    });

    if (!action) {
      throw new ValidationError('Failed to resolve incident');
    }

    res.json({ success: true, action });
  }));

  app.post('/api/incidents/:id/dismiss', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { operatorId } = req.body;
    
    const validation = operatorActionsService.validateAction('dismiss', id);
    if (!validation.valid) {
      throw new ValidationError(validation.reason || 'Invalid action');
    }

    const action = operatorActionsService.executeAction({
      incidentId: id,
      actionType: 'dismiss',
      operatorId
    });

    res.json({ success: true, action });
  }));

  app.post('/api/incidents/:id/escalate', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { operatorId } = req.body;
    
    const validation = operatorActionsService.validateAction('escalate', id);
    if (!validation.valid) {
      throw new ValidationError(validation.reason || 'Invalid action');
    }

    const action = operatorActionsService.executeAction({
      incidentId: id,
      actionType: 'escalate',
      operatorId
    });

    res.json({ success: true, action });
  }));

  app.post('/api/incidents/:id/actions', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { actionType, operatorId, payload } = req.body;
    
    const validation = operatorActionsService.validateAction(actionType, id);
    if (!validation.valid) {
      throw new ValidationError(validation.reason || 'Invalid action');
    }

    const action = operatorActionsService.executeAction({
      incidentId: id,
      actionType,
      operatorId,
      payload
    });

    res.json({ success: true, action });
  }));

  app.get('/api/incidents/:id/actions', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const actions = operatorActionsService.getIncidentActions(id);
    res.json(actions);
  }));

  app.get('/api/operator-actions', asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const actions = operatorActionsService.getRecentActions(limit);
    res.json(actions);
  }));
}
