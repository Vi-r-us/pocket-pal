import { sequelize } from "../db/sequelize.js";
import defineLogModel from "./log.model.js";
import defineUserModel from "./user.model.js";

// sequelize
//   .sync()
//   .then((result) => {
//     console.log('Database synced:', result);
//   })
//   .catch((err) => {
//     console.log(err);
//   });

// console.log('Sequelize models:', sequelize.models);

const User = defineUserModel(sequelize);
const Log = defineLogModel(sequelize);

// console.log('User model sequelize:', User === sequelize.models.User); // true
// console.log('Sequelize models:', sequelize.models.User);

// console.log('User model:', User); 

export { User, Log };
