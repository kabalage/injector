export default function createInjector({
  setDepsOnWindow = false,
  selfName = '$injector'
} = {}) {
  const deps = {};
  let postInjects = [];
  let afterPostInjectHandlers = [];

  const injector = {
    instantiate,
    provide,
    get,
    requestPostInject,
    afterPostInject
  };
  provide([{
    name: selfName,
    provide() { return injector; }
  }]);

  return injector;

  // ==== Methods ====

  function instantiate(provider, locals) {
    const resolvedDependencies =
      Object.assign(
        _getDependencies(provider.dependencies, true, locals),
        _getDependencies(provider.optionalDependencies, false, locals),
      );
    return provider.provide(resolvedDependencies);
  }

  function provide(providers) {
    providers.forEach(provider => {
      if (!provider.dependencies) {
        provider.dependencies = [];
      }
      if (!provider.optionalDependencies) {
        provider.optionalDependencies = [];
      }
      if (!provider.name) {
        console.error(`[Injector] Missing 'name' from service provider`, provider);
        throw new Error(`Missing 'name' from service provider`);
      }
      if (deps[provider.name]) {
        console.warn(`[Injector] Multiple provide called for '${provider.name}'. Maybe you forgot to rename after copy-paste? Second provide is skipped...`);
        return;
      }
      deps[provider.name] = {
        provider,
        discovered: false,
        instance: null
      };
    })
    const keyOrder = _getProvideKeyOrder();
    keyOrder.forEach((key) => {
      const dep = deps[key];
      if (dep.discovered) {
        try {
          const resolvedDependencies =
            Object.assign(
              _getDependencies(dep.provider.dependencies, true),
              _getDependencies(dep.provider.optionalDependencies, false),
            );
          dep.instance = dep.provider.provide(resolvedDependencies);
        } catch (err) {
          if (err.code === 'dependencyNotFound') {
            throw new Error(`Required dependency not found: ${key} -> ${err.key}`);
          }
          throw err;
        }
      } else {
        console.error('WHAT IS THIS CASE?', key, dep);
      }
    });
    const missingPostInjects = [];
    postInjects.forEach((postInject) => {
      const dep = deps[postInject.key] && deps[postInject.key].instance;
      if (!dep) {
        console.warn(`Could not postInject dependency "${postInject.key}" as it is not available`);
        missingPostInjects.push(postInject);
      } else {
        postInject.cb(dep);
      }
    });
    postInjects = missingPostInjects;
    afterPostInjectHandlers.forEach((cb) => {
      cb();
    });
    afterPostInjectHandlers = [];
    if (setDepsOnWindow) {
      window.$deps = Object.keys(deps).reduce((result, depName) => {
        result[depName] = deps[depName].instance;
        return result;
      }, {});
    }
    return _getDependencies(keyOrder);
  }

  function _getProvideKeyOrder() {
    // reverse topological ordering with depth first search
    // https://www.youtube.com/watch?v=yV8gPO5nTzQ&t=308s
    return Object.keys(deps).reduce((keyOrder, key) => {
      if (!deps[key].discovered) {
        return [...keyOrder, ..._keyOrderTraverse(key)];
      } else {
        return keyOrder;
      }
    }, []);
  }

  function _keyOrderTraverse(key, stack = []) {
    deps[key].discovered = true;
    const dependencyKeys = [
      ...deps[key].provider.dependencies,
      ...deps[key].provider.optionalDependencies,
    ];
    // const isOptional = (idx) => idx >= deps[key].provider.dependencies.length;
    const keyOrder = dependencyKeys.reduce((keyOrder, nextKey) => {
      // if (!deps[nextKey] && !isOptional(idx)) {
      //   throw new Error(`Required dependency not found: ${key} -> ${nextKey}`);
      // }
      // TODO deps[nextKey] is undefined when dep is missing
      if (deps[nextKey] && !deps[nextKey].discovered) {
        return [...keyOrder, ..._keyOrderTraverse(nextKey, [...stack, key])];
      } else {
        if (stack.indexOf(nextKey) >= 0) {
          const cycle = [...stack.slice(stack.indexOf(nextKey)), key, nextKey];
          console.error(`Dependency cycle found: ${cycle.join(' -> ')} \nConsider using 'requestPostInject'`);
        }
        return keyOrder;
      }
    }, []);

    return [...keyOrder, key];
  }

  function _getDependencies(keys, strict = false, locals = {}) {
    return keys.reduce((depsObj, key) => {
      depsObj[key] = deps[key] && deps[key].instance || locals[key];
      if (strict && !depsObj[key]) {
        throw Object.assign(new Error(`Dependency not found: ${key}`), {
          code: 'dependencyNotFound',
          key
        });
      }
      return depsObj;
    }, {});
  }

  function get(keys) {
    if (Array.isArray(keys)) {
      return _getDependencies(keys);
    } else {
      const key = keys;
      return deps[key] && deps[key].instance;
    }
  }

  function requestPostInject(key, cb) {
    postInjects.push({ key, cb });
  }

  function afterPostInject(cb) {
    afterPostInjectHandlers.push(cb);
  }
}
