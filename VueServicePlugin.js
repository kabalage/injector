import createInjector from './index';

export default {
  install(Vue, options) {
    Vue.$services = createInjector({
      setDepsOnWindow: process.env.NODE_ENV === 'development',
      selfName: '$services'
    });
    Vue.prototype.$services = Vue.$services;

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
