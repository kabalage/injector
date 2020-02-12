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
  provide({ [selfName]: () => injector });

  return injector;

  // ==== Methods ====

  function instantiate(provider, locals) {
    if (typeof provider === 'function') {
      provider = {
        provide: provider,
        deps: []
      };
    }
    const depsArray = _getDepsArray(provider.deps, locals);
    return provider.provide.apply(null, depsArray);
  }

  function provide(providers) {
    for (const key in providers) {
      let provider = providers[key];
      if (typeof provider === 'function') {
        provider = {
          provide: provider,
          deps: []
        };
      }
      deps[key] = {
        provider,
        discovered: false,
        instance: null
      };
    }
    const keyOrder = _getProvideKeyOrder();
    keyOrder.forEach((key) => {
      const dep = deps[key];
      if (dep.discovered) {
        const depsArray = _getDepsArray(dep.provider.deps);
        dep.instance = dep.provider.provide.apply(null, depsArray);
      }
    });
    const missingPostInjects = [];
    postInjects.forEach((postInject) => {
      const dep = get(postInject.key);
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
    return _getDepsArray(keyOrder);
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
    const dependencyKeys = deps[key].provider.deps;
    const keyOrder = dependencyKeys.reduce((keyOrder, nextKey) => {
      if (!deps[nextKey].discovered) {
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

  function _getDepsArray(keys, locals = {}) {
    return keys.map(key => {
      if (!deps[key] && !locals[key]) {
        throw new Error(`Dependency not found: ${key}`);
      } else {
        return deps[key] && deps[key].instance
          || locals[key];
      }
    });
  }

  function get(keys) {
    if (Array.isArray(keys)) {
      return keys.reduce((depsObj, key) => {
        depsObj[key] = deps[key] && deps[key].instance;
        return depsObj;
      }, {});
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
