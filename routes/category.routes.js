const {Router} = require(`express`);
const catCtrl = require(`../controllers/category.controller`);
const protectRoute = require(`../middlewares/protect-routes`);

const catRouter = Router();

catRouter.get(`/categorias`, protectRoute ,catCtrl.renderCategory);

module.exports = catRouter;