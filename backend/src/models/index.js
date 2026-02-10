import { sequelize } from "../db/sequelize.js";
import defineAccountModel from "./account.model.js";
import defineCategoryModel from "./category.model.js";
import defineCategoryGroupModel from "./categoryGroup.model.js";
import defineCurrencyModel from "./currency.model.js";
import defineFXRateModel from "./fxRate.model.js";
import defineLogModel from "./log.model.js";
import defineUserModel from "./user.model.js";
import defineTransactionModel from "./transaction.model.js";
import defineUserHiddenCategoryModel from "./userHiddenCategory.model.js";

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

// const Currency = defineCurrencyModel(sequelize);
// const FXRate = defineFXRateModel(sequelize);

// const Account = defineAccountModel(sequelize);
const Category = defineCategoryModel(sequelize);
const CategoryGroup = defineCategoryGroupModel(sequelize);
// const Transaction = defineTransactionModel(sequelize);
const UserHiddenCategory = defineUserHiddenCategoryModel(sequelize);

// console.log('User model sequelize:', User === sequelize.models.User); // true
// console.log('Sequelize models:', sequelize.models.User);

// console.log('User model:', User); 

// Set up associations by calling the associate methods on each model
// This must happen after all models are defined, so they can reference each other
Object.keys(sequelize.models).forEach((modelName) => {
  if (sequelize.models[modelName].associate) {
    sequelize.models[modelName].associate(sequelize.models);
  }
});


export { User, Log, Category, CategoryGroup, UserHiddenCategory };
