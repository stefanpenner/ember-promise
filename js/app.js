App = Ember.Application.create();

App.Router.map(function() {
  // put your routes here
});

App.register('store:main', {
  find: function(type, id) {
    return new Ember.RSVP.Promise(function(resolve) {
      Ember.run.later(function() {
        resolve({
          name: type +'#' + id
        });
      }, 1000);
    });
  }
}, { instantiate: false });

App.inject('controller', 'store', 'store:main');

App.IndexController = Ember.Controller.extend({
  foo: Ember.computed(function(){
    return this.store.find('user', 1);
  })
});

var FULFILLED = 1;
var REJECTED = 2;

var PromiseProxyHandler = {
  notifyPropertChanges: function(promise, payload) {
    try {
      Ember.beginPropertyChanges();
      Ember.set(promise, 'isLoaded',  true);
      Ember.set(promise, 'isLoading', false);

      var unknownProperties = promise._unknownProperties;
      for (i = 0; i < unknownProperties.length; i++) {
        prop = unknownProperties[i];
        if (prop in payload) {
          Ember.propertyDidChange(promise, prop);
        }
      }
    } finally {
      promise._unknownProperties.length = 0;
      Ember.endPropertyChanges();
    }
  },

  didFulfill: function(promise, payload) {
    var prop, i;

    Ember.set(promise, '_context', payload);
    promise._realized = true;

    var willWatchProperties = promise._willWatchProperties;

    for (i = 0; i < willWatchProperties.length; i++) {
      prop = willWatchProperties[i];
      promise.willWatchProperty(prop);
    }

    willWatchProperties.length = 0;

    var didUnwatchProperties = promise._didUnwatchProperties;

    for (i = 0; i < didUnwatchProperties.length; i++) {
      prop = willWatchProperties[i];
      promise.willWatchProperty(prop);
    }

    didUnwatchProperties.length = 0;

    PromiseProxyHandler.notifyPropertChanges(promise, payload);
  },

  didReject: function(promise, reason) {
    Ember.set(promise, 'isErrored', true);
    Ember.set(promise, 'isLoading', false);
    Ember.set(promise, 'reason', reason);
  },

  setupProxy: function(promise) {
    promise.__isProxy__ = true;

    promise._unknownProperties    = [];
    promise._watchedProperties    = [];
    promise._willWatchProperties  = [];
    promise._didUnwatchProperties = [];

    promise._realized = undefined;
    promise._context  = undefined;
    promise.isLoading = true;
    promise.isErrored = false;
    promise.isLoaded  = false;
    promise.reason    = undefined;

    if (promise._state === FULFILLED) {
      PromiseProxyHandler.didFulfill(promise, promise._context);
    } else if (promise._state === REJECTED) {
      PromiseProxyHandler.didReject(promise, promise._context);
    } else {
      promise.then(function(payload) {
        PromiseProxyHandler.didFulfill(promise, payload);
      }, function(reason) {
        PromiseProxyHandler.didReject(promise, reason);
      });
    }
  }
};

function contentPropertyWillChange(obj, key) {
  Ember.propertyWillChange(obj, key);
}

function contentPropertyDidChange(obj, key) {
  Ember.propertyDidChange(obj, key);
}

var ObjectProxyPromiseMixin = {
  setUnknownProperty: function(property, value) {
    if (this._realized) {
      return Ember.set(this._context, property, value);
    } else {

      PromiseProxyHandler.setupProxy(this);

      if (this._state === FULFILLED) {
        throw new TypeError("cannot set to unfullfiled ObjectPromise with: " + property);
      }
    }
  },

  __isProxy__: false,
  _unknownProperties:    undefined,
  _watchedProperties:    undefined,
  _willWatchProperties:  undefined,
  _didUnwatchProperties: undefined,

  _realized: undefined,
  _context:  undefined,
  isLoading: undefined,
  isErrored: undefined,
  isLoaded:  undefined,
  reason:    undefined,

  unknownProperty: function(property) {
    if (this._realized) {
      return this._context[property];
    } else if (!this.__isProxy__) {
      PromiseProxyHandler.setupProxy(this);
    }

    this._unknownProperties.push(property);
  },

  willWatchProperty: function (key) {
    if (this._realized && this.__isProxy__) {
      Ember.addBeforeObserver(this._context, key, null, contentPropertyWillChange);
      Ember.addObserver(this._context, key, null, contentPropertyDidChange);
    } else {
      if (!this.__isProxy__) {
        PromiseProxyHandler.setupProxy(this);
      }

      this._willWatchProperties.push(key);
    }
  },

  didUnwatchProperty: function (key) {
    if (!this.__isProxy__) {
      PromiseProxyHandler.setupProxy(this);
    }

    Ember.removeBeforeObserver(this._context, key, null, contentPropertyWillChange);
    Ember.removeObserver(this._context, key, null, contentPropertyDidChange);

    this._didUnwatchProperties.push(key);
  }
};

Ember.mixin(Ember.RSVP.Promise.prototype, ObjectProxyPromiseMixin);

