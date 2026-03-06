import type { Request, Response, NextFunction } from "express";
import { CreateMatchService } from "../../application/services/create-match.service";

export class MatchController {
  constructor(private readonly createMatchService: CreateMatchService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const match = await this.createMatchService.execute(req.body);

      return res.status(201).json({
        data: match,
      });
    } catch (error) {
      next(error);
    }
  };
}
