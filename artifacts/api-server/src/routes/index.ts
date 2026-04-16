import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import projectsRouter from "./projects";
import financeRouter from "./finance";
import vendorsRouter from "./vendors";
import procurementRouter from "./procurement";
import inventoryRouter from "./inventory";
import tendersRouter from "./tenders";
import vehiclesRouter from "./vehicles";
import hrRouter from "./hr";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(projectsRouter);
router.use(financeRouter);
router.use(vendorsRouter);
router.use(procurementRouter);
router.use(inventoryRouter);
router.use(tendersRouter);
router.use(vehiclesRouter);
router.use(hrRouter);

export default router;
