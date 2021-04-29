import createInjector from './index';

export default {
  install(Vue, options) {
    Vue.$services = options.injector || createInjector({
      setDepsOnWindow: process.client
        ? process.env.NODE_ENV === 'development'
        : false,
      selfName: '$services'
    });
    Vue.prototype.$services = Vue.$services;
    Vue.config.optionMergeStrategies.services = (toVal, fromVal) => {
      if (!toVal) return fromVal;
      if (!fromVal) return toVal;
      return toVal.concat(fromVal);
    }

    Vue.mixin({
      beforeCreate() {
        if (this.$options.provideServices) {
          const providers = this.$options.provideServices();
          this.$services.provide(providers);
        }
        if (this.$options.services) {
          Object.assign(this, this.$services.get(this.$options.services));
        }
      }
    });
  }
};
