const ExtractCssChunks = require('extract-css-chunks-webpack-plugin');
const findUp = require('find-up');

const fileExtensions = new Set();
let extractCssInitialized = false;

module.exports = (
  config,
  {
    extensions = [],
    cssModules = false,
    cssLoaderOptions = {},
    dev,
    isServer,
    postcssLoaderOptions = {},
    loaders = [],
  },
) => {
  // We have to keep a list of extensions for the splitchunk config
  // eslint-disable-next-line
  for (const extension of extensions) {
    fileExtensions.add(extension);
  }

  if (!isServer) {
    // eslint-disable-next-line
    config.optimization.splitChunks.cacheGroups.styles = {
      name: 'styles',
      test: new RegExp(`\\.+(${[...fileExtensions].join('|')})$`),
      chunks: 'all',
      enforce: true,
    };
  }

  if (!isServer && !extractCssInitialized) {
    config.plugins.push(new ExtractCssChunks({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: dev
        ? 'static/css/[name].css'
        : 'static/css/[name].[contenthash:8].css',
      chunkFilename: dev
        ? 'static/css/[name].chunk.css'
        : 'static/css/[name].[contenthash:8].chunk.css',
      orderWarning: false,
      reloadAll: true,
    }));
    extractCssInitialized = true;
  }

  const postcssConfig = findUp.sync('postcss.config.js', {
    cwd: config.context,
  });
  let postcssLoader;

  if (postcssConfig) {
    // Copy the postcss-loader config options first.
    const postcssOptionsConfig = Object.assign(
      {},
      postcssLoaderOptions.config,
      { path: postcssConfig },
    );

    postcssLoader = {
      loader: 'postcss-loader',
      options: Object.assign({}, postcssLoaderOptions, {
        config: postcssOptionsConfig,
      }),
    };
  }

  const cssLoader = {
    loader: isServer ? 'css-loader/locals' : 'css-loader',
    options: Object.assign(
      {},
      {
        modules: cssModules,
        minimize: !dev,
        sourceMap: dev,
        importLoaders: loaders.length + (postcssLoader ? 1 : 0),
      },
      cssLoaderOptions,
    ),
  };

  // When not using css modules we don't transpile on the server
  if (isServer && !cssLoader.options.modules) {
    return ['ignore-loader'];
  }

  // When on the server and using css modules we transpile the css
  if (isServer && cssLoader.options.modules) {
    return [cssLoader, postcssLoader, ...loaders].filter(Boolean);
  }

  return [
    !isServer && dev && 'extracted-loader',
    !isServer && ExtractCssChunks.loader,
    cssLoader,
    postcssLoader,
    ...loaders,
  ].filter(Boolean);
};