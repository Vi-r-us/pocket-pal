/**
 * Returns an object containing the current state of the given model instance
 * based on the provided data.
 *
 * @param {Object} modelInstance - The model instance to get the state from.
 * @param {Object} data - The data to get the state from.
 * @returns {Object} - The state object containing the current values of the model instance.
 */
const getState = (modelInstance, data) => {
  const state = {};
  Object.keys(data).forEach((key) => {
    state[key] = modelInstance[key];
  });
  return state;
};

export default getState;
