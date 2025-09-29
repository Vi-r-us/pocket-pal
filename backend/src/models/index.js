import { sequelize } from "../db/sequelize.js";
import defineLogModel from "./log.model.js";
import defineUserModel from "./user.model.js";

const User = defineUserModel(sequelize);
const Log = defineLogModel(sequelize);

export { User, Log };