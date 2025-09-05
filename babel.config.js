module.exports = function(api) {
  api.cache(true);
  const presets = ['babel-preset-expo'];
  const plugins = [];

  // Add the commonjs transform plugin only for the test environment,
  // which is set by Jest automatically.
  if (process.env.NODE_ENV === 'test') {
    plugins.push('@babel/plugin-transform-modules-commonjs');
  }

  return {
    presets,
    plugins,
  };
};
