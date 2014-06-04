Make RSVP.Promise bindable/observable
======================================

Without PromiseProxy
--------------------
this is an experiment, don't actually use this


No PromiseProxy needed, and promise.get/promise.set don't work which prevents users from unleashing zalgo.

get/set can be re-introuced but as promise returning zalgo proof functions

also, deep get/set chains like get('foo.bar.baz') should work, and bridge multiple promise e.g ember-data relationships. For this to work correctly, they must work like chains where if any node in the chain changes, the final promise represents the updated value (until it fullfills the first time.)

why?

because!

Actually, the PromiseProxy experiment seems to have been successful. But it's a hack. So rather then having to wrap each promise in a promise proxy to enable binding, what if the raw promise just behaved as good citizen.

PromiseProxy makes it easy to run into zalgo problems, as get/set work if and only if the promise has fulfilled

We can do better
