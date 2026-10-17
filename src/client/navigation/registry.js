// PAGE_CLIENT_ROUTES_ is generated from build.config.json, shared with server page registration.
function getClientPageState_(pageName) {
  const route = Object.prototype.hasOwnProperty.call(PAGE_CLIENT_ROUTES_, pageName) ? PAGE_CLIENT_ROUTES_[pageName] : null;
  return route ? route.state : pageName.toLowerCase().replace('page_', '');
}
function initializeClientPage_(pageName) {
  const route = Object.prototype.hasOwnProperty.call(PAGE_CLIENT_ROUTES_, pageName) ? PAGE_CLIENT_ROUTES_[pageName] : null;
  if (route) route.initialize();
}
