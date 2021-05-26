
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/CloseIcon.svelte generated by Svelte v3.38.2 */

    const file$e = "src/components/CloseIcon.svelte";

    function create_fragment$m(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z");
    			add_location(path, file$e, 5, 2, 140);
    			attr_dev(svg, "class", /*clazz*/ ctx[0]);
    			attr_dev(svg, "viewBox", "0 0 20 20");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "role", "button");
    			add_location(svg, file$e, 4, 0, 72);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*clazz*/ 1) {
    				attr_dev(svg, "class", /*clazz*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$m.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$m($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CloseIcon", slots, []);
    	let { class: clazz = "" } = $$props;
    	const writable_props = ["class"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CloseIcon> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, clazz = $$props.class);
    	};

    	$$self.$capture_state = () => ({ clazz });

    	$$self.$inject_state = $$props => {
    		if ("clazz" in $$props) $$invalidate(0, clazz = $$props.clazz);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [clazz];
    }

    class CloseIcon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$m, create_fragment$m, safe_not_equal, { class: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CloseIcon",
    			options,
    			id: create_fragment$m.name
    		});
    	}

    	get class() {
    		throw new Error("<CloseIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<CloseIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    let alert = writable(null);
    let output = writable(null);
    let objectView = writable(false);
    output.subscribe(console.log);

    /* src/components/Alert.svelte generated by Svelte v3.38.2 */
    const file$d = "src/components/Alert.svelte";

    function create_fragment$l(ctx) {
    	let div;
    	let span0;
    	let t0_value = /*$alert*/ ctx[3]?.message + "";
    	let t0;
    	let t1;
    	let span1;
    	let closeicon;
    	let div_class_value;
    	let current;
    	let mounted;
    	let dispose;

    	closeicon = new CloseIcon({
    			props: {
    				class: "fill-current h-6 w-6 " + /*iconColor*/ ctx[1]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			create_component(closeicon.$$.fragment);
    			attr_dev(span0, "class", "block sm:inline pr-4");
    			add_location(span0, file$d, 66, 2, 1936);
    			attr_dev(span1, "class", "absolute top-0 bottom-0 right-0 px-4 py-3");
    			add_location(span1, file$d, 67, 2, 1998);
    			attr_dev(div, "class", div_class_value = "pl-4 pr-8 py-3 rounded fixed top-6 left-0 right-0 w-72 mx-auto\n    lg:w-fit-content lg:max-w-2/3 lg:min-w-72\n    transition-all ease-in-out duration-500\n    " + /*style*/ ctx[0] + " ");
    			attr_dev(div, "role", "alert");
    			toggle_class(div, "opacity-0", !/*fade*/ ctx[2]);
    			toggle_class(div, "hidden", !/*$alert*/ ctx[3]?.message);
    			add_location(div, file$d, 57, 0, 1676);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(span0, t0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    			mount_component(closeicon, span1, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(span1, "click", /*reset*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*$alert*/ 8) && t0_value !== (t0_value = /*$alert*/ ctx[3]?.message + "")) set_data_dev(t0, t0_value);
    			const closeicon_changes = {};
    			if (dirty & /*iconColor*/ 2) closeicon_changes.class = "fill-current h-6 w-6 " + /*iconColor*/ ctx[1];
    			closeicon.$set(closeicon_changes);

    			if (!current || dirty & /*style*/ 1 && div_class_value !== (div_class_value = "pl-4 pr-8 py-3 rounded fixed top-6 left-0 right-0 w-72 mx-auto\n    lg:w-fit-content lg:max-w-2/3 lg:min-w-72\n    transition-all ease-in-out duration-500\n    " + /*style*/ ctx[0] + " ")) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (dirty & /*style, fade*/ 5) {
    				toggle_class(div, "opacity-0", !/*fade*/ ctx[2]);
    			}

    			if (dirty & /*style, $alert*/ 9) {
    				toggle_class(div, "hidden", !/*$alert*/ ctx[3]?.message);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(closeicon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(closeicon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(closeicon);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let $alert;
    	validate_store(alert, "alert");
    	component_subscribe($$self, alert, $$value => $$invalidate(3, $alert = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Alert", slots, []);
    	let resetTimeout = null;
    	let subscriptionTimeout = null;
    	let error = "bg-red-100 border border-red-400 text-red-700";
    	let warning = "bg-orange-100 border border-orange-400 text-orange-700";
    	let success = "bg-green-100 border border-green-400 text-green-700";
    	let info = "bg-blue-100 border border-blue-400 text-blue-700";
    	let style = "";
    	let iconColor = "";
    	let fade = false;

    	const reset = () => {
    		if (resetTimeout) clearTimeout(resetTimeout);
    		$$invalidate(2, fade = false);
    		resetTimeout = setTimeout(() => alert.set(null), 500);
    	};

    	const updateStyle = () => {
    		switch ($alert === null || $alert === void 0
    		? void 0
    		: $alert.variant) {
    			case "error":
    				$$invalidate(0, style = error);
    				$$invalidate(1, iconColor = "text-red-500");
    				break;
    			case "warning":
    				$$invalidate(0, style = warning);
    				$$invalidate(1, iconColor = "text-orange-500");
    				break;
    			case "success":
    				$$invalidate(0, style = success);
    				$$invalidate(1, iconColor = "text-green-500");
    				break;
    			case "info":
    				$$invalidate(0, style = info);
    				$$invalidate(1, iconColor = "text-blue-500");
    				break;
    			default:
    				$$invalidate(0, style = error);
    				$$invalidate(1, iconColor = "text-red-500");
    				break;
    		}
    	};

    	onMount(() => {
    		alert.subscribe(message => {
    			if (message) {
    				updateStyle();
    				$$invalidate(2, fade = true);
    				if (subscriptionTimeout) clearTimeout(subscriptionTimeout);

    				subscriptionTimeout = setTimeout(
    					() => {
    						reset();
    					},
    					10000
    				);
    			}
    		});
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Alert> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		CloseIcon,
    		alert,
    		onMount,
    		resetTimeout,
    		subscriptionTimeout,
    		error,
    		warning,
    		success,
    		info,
    		style,
    		iconColor,
    		fade,
    		reset,
    		updateStyle,
    		$alert
    	});

    	$$self.$inject_state = $$props => {
    		if ("resetTimeout" in $$props) resetTimeout = $$props.resetTimeout;
    		if ("subscriptionTimeout" in $$props) subscriptionTimeout = $$props.subscriptionTimeout;
    		if ("error" in $$props) error = $$props.error;
    		if ("warning" in $$props) warning = $$props.warning;
    		if ("success" in $$props) success = $$props.success;
    		if ("info" in $$props) info = $$props.info;
    		if ("style" in $$props) $$invalidate(0, style = $$props.style);
    		if ("iconColor" in $$props) $$invalidate(1, iconColor = $$props.iconColor);
    		if ("fade" in $$props) $$invalidate(2, fade = $$props.fade);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [style, iconColor, fade, $alert, reset];
    }

    class Alert extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$l, create_fragment$l, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Alert",
    			options,
    			id: create_fragment$l.name
    		});
    	}
    }

    /* src/components/BrandIcon.svelte generated by Svelte v3.38.2 */

    const file$c = "src/components/BrandIcon.svelte";

    function create_fragment$k(ctx) {
    	let svg;
    	let path0;
    	let path1;
    	let path2;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			attr_dev(path0, "d", "M19.0733 3.50847L0.945802 35.3966C-1.28173 39.3729 0.638556 44.1288 4.47912 45.5322C4.17188 43.9729 4.40231 42.2576 5.32405 40.6203L23.9892 7.87458C25.6022 4.98983 28.7515 3.82034 31.5935 4.3661L31.1327 3.50847C28.4443 -1.16949 21.7617 -1.16949 19.0733 3.50847Z");
    			attr_dev(path0, "fill", /*color*/ ctx[1]);
    			add_location(path0, file$c, 6, 2, 142);
    			attr_dev(path1, "d", "M25.5254 11.1491L10.7008 37.2677C8.62694 40.9321 11.0081 45.5321 15.0023 45.9999C15.0023 44.9864 15.2327 43.8948 15.7704 42.8813L30.5182 16.9186C31.9776 14.4236 34.8196 13.566 37.2008 14.2677L35.4341 11.1491C33.2834 7.25077 27.753 7.25077 25.5254 11.1491Z");
    			attr_dev(path1, "fill", /*color*/ ctx[1]);
    			add_location(path1, file$c, 10, 2, 442);
    			attr_dev(path2, "d", "M32.3616 19.1015L20.8399 39.2948C19.15 42.2575 21.3007 45.9999 24.6804 45.9999H41.0413H43.192H45.3427H47.5702C50.9499 45.9999 53.1006 42.2575 51.4108 39.2948L50.3354 37.2677L49.2601 35.3965L44.6514 27.288L40.0427 19.1795C38.2761 16.1388 34.0514 16.1388 32.3616 19.1015ZM48.1847 33.5253L47.8007 32.9015L48.1847 33.5253Z");
    			attr_dev(path2, "fill", /*color*/ ctx[1]);
    			add_location(path2, file$c, 14, 2, 736);
    			attr_dev(svg, "class", /*clazz*/ ctx[0]);
    			attr_dev(svg, "viewBox", "0 0 52 46");
    			add_location(svg, file$c, 5, 0, 100);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, path2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*color*/ 2) {
    				attr_dev(path0, "fill", /*color*/ ctx[1]);
    			}

    			if (dirty & /*color*/ 2) {
    				attr_dev(path1, "fill", /*color*/ ctx[1]);
    			}

    			if (dirty & /*color*/ 2) {
    				attr_dev(path2, "fill", /*color*/ ctx[1]);
    			}

    			if (dirty & /*clazz*/ 1) {
    				attr_dev(svg, "class", /*clazz*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("BrandIcon", slots, []);
    	let { class: clazz = "" } = $$props;
    	let { color = "white" } = $$props;
    	const writable_props = ["class", "color"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<BrandIcon> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, clazz = $$props.class);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    	};

    	$$self.$capture_state = () => ({ clazz, color });

    	$$self.$inject_state = $$props => {
    		if ("clazz" in $$props) $$invalidate(0, clazz = $$props.clazz);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [clazz, color];
    }

    class BrandIcon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, { class: 0, color: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BrandIcon",
    			options,
    			id: create_fragment$k.name
    		});
    	}

    	get class() {
    		throw new Error("<BrandIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<BrandIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<BrandIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<BrandIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/TwitterIcon.svelte generated by Svelte v3.38.2 */

    const file$b = "src/components/TwitterIcon.svelte";

    function create_fragment$j(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M31.0934 8.58666C31.1883 8.5078 31.2594 8.40417 31.2989 8.28728C31.3384 8.1704 31.3446 8.04485 31.317 7.92461C31.2894 7.80438 31.2289 7.69417 31.1423 7.60626C31.0558 7.51835 30.9465 7.45618 30.8267 7.42666L29.7734 7.16C29.6776 7.13602 29.5884 7.09107 29.5121 7.02839C29.4358 6.96571 29.3744 6.88687 29.3323 6.79757C29.2902 6.70826 29.2685 6.61072 29.2687 6.51199C29.2688 6.41326 29.291 6.3158 29.3334 6.22666L29.9201 5.04C29.9755 4.92501 29.9967 4.79652 29.9813 4.66981C29.9658 4.54311 29.9143 4.4235 29.8329 4.32521C29.7514 4.22691 29.6435 4.15407 29.5219 4.11533C29.4002 4.07659 29.27 4.07358 29.1467 4.10666L26.4801 4.85333C26.3807 4.88231 26.276 4.88776 26.1742 4.86924C26.0723 4.85073 25.9762 4.80876 25.8934 4.74666C24.7394 3.88118 23.3359 3.41333 21.8934 3.41333C20.1253 3.41333 18.4296 4.11571 17.1794 5.36595C15.9291 6.61619 15.2267 8.31189 15.2267 10.08V10.56C15.2273 10.6419 15.1978 10.7211 15.1437 10.7826C15.0896 10.8441 15.0147 10.8835 14.9334 10.8933C11.1867 11.3333 7.60008 9.42666 3.73341 4.97333C3.64941 4.88069 3.5415 4.81301 3.42153 4.77772C3.30156 4.74244 3.17419 4.74092 3.05341 4.77333C2.9446 4.82334 2.85128 4.90174 2.78324 5.00028C2.7152 5.09882 2.67496 5.21386 2.66674 5.33333C2.13269 7.52712 2.34861 9.83656 3.28008 11.8933C3.30764 11.9479 3.31967 12.009 3.31485 12.0699C3.31004 12.1308 3.28857 12.1893 3.25278 12.2388C3.217 12.2884 3.16828 12.3271 3.11195 12.3508C3.05563 12.3746 2.99386 12.3823 2.93341 12.3733L1.44007 12.08C1.33402 12.0629 1.22542 12.0718 1.12352 12.1057C1.02161 12.1397 0.92942 12.1978 0.854788 12.275C0.780157 12.3523 0.725296 12.4464 0.694876 12.5494C0.664456 12.6524 0.659378 12.7613 0.680075 12.8667C0.795193 13.8899 1.13897 14.8742 1.68597 15.7466C2.23296 16.619 2.96916 17.3573 3.84008 17.9067C3.89643 17.934 3.94396 17.9766 3.97722 18.0296C4.01047 18.0827 4.02811 18.144 4.02811 18.2067C4.02811 18.2693 4.01047 18.3306 3.97722 18.3837C3.94396 18.4368 3.89643 18.4794 3.84008 18.5067L3.13341 18.7867C3.04759 18.8211 2.96986 18.873 2.90517 18.939C2.84048 19.0051 2.79024 19.0839 2.75764 19.1704C2.72503 19.2569 2.71079 19.3493 2.7158 19.4416C2.72081 19.5339 2.74497 19.6242 2.78674 19.7067C3.17753 20.5618 3.76988 21.3093 4.51301 21.8853C5.25613 22.4612 6.12785 22.8483 7.05341 23.0133C7.11776 23.0367 7.17336 23.0793 7.21265 23.1354C7.25194 23.1914 7.27302 23.2582 7.27302 23.3267C7.27302 23.3951 7.25194 23.4619 7.21265 23.518C7.17336 23.574 7.11776 23.6166 7.05341 23.64C5.24056 24.3898 3.29509 24.7662 1.33341 24.7467C1.1566 24.7113 0.97298 24.7476 0.822951 24.8476C0.672922 24.9477 0.56877 25.1032 0.533408 25.28C0.498046 25.4568 0.53437 25.6404 0.634389 25.7905C0.734409 25.9405 0.88993 26.0446 1.06674 26.08C4.46347 27.691 8.16165 28.5678 11.9201 28.6533C15.226 28.7038 18.4731 27.776 21.2534 25.9867C23.5404 24.4601 25.4141 22.3913 26.7076 19.9649C28.0011 17.5384 28.6741 14.8297 28.6667 12.08V10.92C28.6676 10.8232 28.6895 10.7277 28.7309 10.6402C28.7723 10.5527 28.8324 10.4753 28.9067 10.4133L31.0934 8.58666Z");
    			attr_dev(path, "fill", /*color*/ ctx[1]);
    			add_location(path, file$b, 6, 2, 142);
    			attr_dev(svg, "class", /*clazz*/ ctx[0]);
    			attr_dev(svg, "viewBox", "0 0 32 32");
    			add_location(svg, file$b, 5, 0, 100);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*color*/ 2) {
    				attr_dev(path, "fill", /*color*/ ctx[1]);
    			}

    			if (dirty & /*clazz*/ 1) {
    				attr_dev(svg, "class", /*clazz*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("TwitterIcon", slots, []);
    	let { class: clazz = "" } = $$props;
    	let { color = "white" } = $$props;
    	const writable_props = ["class", "color"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TwitterIcon> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, clazz = $$props.class);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    	};

    	$$self.$capture_state = () => ({ clazz, color });

    	$$self.$inject_state = $$props => {
    		if ("clazz" in $$props) $$invalidate(0, clazz = $$props.clazz);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [clazz, color];
    }

    class TwitterIcon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, { class: 0, color: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TwitterIcon",
    			options,
    			id: create_fragment$j.name
    		});
    	}

    	get class() {
    		throw new Error("<TwitterIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<TwitterIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<TwitterIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<TwitterIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/GithubIcon.svelte generated by Svelte v3.38.2 */

    const file$a = "src/components/GithubIcon.svelte";

    function create_fragment$i(ctx) {
    	let svg;
    	let g;
    	let path;
    	let defs;
    	let clipPath;
    	let rect;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g = svg_element("g");
    			path = svg_element("path");
    			defs = svg_element("defs");
    			clipPath = svg_element("clipPath");
    			rect = svg_element("rect");
    			attr_dev(path, "d", "M16.0001 0.373292C12.191 0.37216 8.50648 1.72998 5.60904 4.20261C2.71161 6.67523 0.791354 10.1004 0.193569 13.8623C-0.404216 17.6242 0.359689 21.4759 2.34792 24.7249C4.33615 27.9739 7.41827 30.4069 11.0401 31.5866H11.4267C11.6154 31.5983 11.8043 31.5698 11.9811 31.5029C12.1579 31.436 12.3184 31.3323 12.4521 31.1987C12.5857 31.065 12.6894 30.9045 12.7563 30.7277C12.8232 30.5509 12.8518 30.3619 12.8401 30.1733V29.8933C12.8401 29.6666 12.8401 29.36 12.8401 28.44C12.827 28.3526 12.7967 28.2687 12.7509 28.1932C12.7051 28.1177 12.6448 28.052 12.5734 28C12.4959 27.9373 12.4054 27.8928 12.3085 27.8697C12.2116 27.8467 12.1108 27.8456 12.0134 27.8666C8.44006 28.64 7.68006 26.4 7.62673 26.2533C7.17927 25.0681 6.37877 24.0489 5.33339 23.3333C5.27076 23.2791 5.20388 23.2301 5.13339 23.1866C5.28834 23.1032 5.46556 23.0706 5.64006 23.0933C5.97518 23.1399 6.29253 23.2724 6.56122 23.4781C6.82992 23.6837 7.04082 23.9553 7.17339 24.2666C7.68919 25.1647 8.53323 25.8278 9.52794 26.1162C10.5226 26.4047 11.5905 26.2961 12.5067 25.8133C12.6051 25.7703 12.6915 25.7042 12.7589 25.6207C12.8262 25.5371 12.8723 25.4385 12.8934 25.3333C12.9444 24.7165 13.2084 24.1368 13.6401 23.6933C13.7359 23.6082 13.8052 23.4973 13.8396 23.3738C13.874 23.2504 13.8721 23.1196 13.8341 22.9972C13.7961 22.8748 13.7236 22.766 13.6254 22.6837C13.5271 22.6014 13.4072 22.5492 13.2801 22.5333C10.1201 22.1733 6.89339 21.0666 6.89339 15.6133C6.86676 14.2438 7.36805 12.9166 8.29339 11.9066C8.37862 11.8125 8.43519 11.696 8.45644 11.5708C8.4777 11.4456 8.46277 11.3169 8.41339 11.2C8.04283 10.1647 8.04755 9.03213 8.42673 7.99996C9.6585 8.21831 10.8146 8.74591 11.7867 9.53329C11.867 9.58997 11.9591 9.6278 12.0561 9.64396C12.153 9.66012 12.2524 9.6542 12.3467 9.62662C13.5378 9.30353 14.766 9.13768 16.0001 9.13329C17.2388 9.13433 18.4718 9.30023 19.6667 9.62662C19.7591 9.65212 19.856 9.65697 19.9505 9.64084C20.0449 9.62471 20.1347 9.58799 20.2134 9.53329C21.187 8.74838 22.3425 8.22109 23.5734 7.99996C23.9364 9.0266 23.9364 10.1467 23.5734 11.1733C23.524 11.2903 23.5091 11.4189 23.5303 11.5441C23.5516 11.6693 23.6082 11.7858 23.6934 11.88C24.6092 12.8798 25.1098 14.1909 25.0934 15.5466C25.0934 21 21.8534 22.0933 18.6801 22.4533C18.5499 22.4668 18.4266 22.5184 18.3256 22.6015C18.2245 22.6847 18.1502 22.7957 18.1118 22.9208C18.0734 23.0459 18.0727 23.1796 18.1097 23.3051C18.1467 23.4306 18.2199 23.5424 18.3201 23.6266C18.6154 23.9315 18.8411 24.2968 18.9815 24.6973C19.1219 25.0979 19.1737 25.5241 19.1334 25.9466V30.1866C19.1268 30.3951 19.1664 30.6024 19.2494 30.7937C19.3324 30.9851 19.4567 31.1557 19.6134 31.2933C19.813 31.4427 20.0447 31.5434 20.29 31.5874C20.5354 31.6314 20.7877 31.6174 21.0267 31.5466C24.6242 30.3431 27.677 27.9006 29.6405 24.6548C31.604 21.409 32.3504 17.5712 31.7465 13.8261C31.1426 10.0811 29.2277 6.67237 26.3435 4.20829C23.4594 1.7442 19.7935 0.385031 16.0001 0.373292Z");
    			attr_dev(path, "fill", /*color*/ ctx[1]);
    			add_location(path, file$a, 7, 4, 174);
    			attr_dev(g, "clip-path", "url(#clip0)");
    			add_location(g, file$a, 6, 2, 142);
    			attr_dev(rect, "width", "32");
    			attr_dev(rect, "height", "32");
    			add_location(rect, file$a, 14, 6, 3144);
    			attr_dev(clipPath, "id", "clip0");
    			add_location(clipPath, file$a, 13, 4, 3116);
    			add_location(defs, file$a, 12, 2, 3105);
    			attr_dev(svg, "class", /*clazz*/ ctx[0]);
    			attr_dev(svg, "viewBox", "0 0 32 32");
    			add_location(svg, file$a, 5, 0, 100);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g);
    			append_dev(g, path);
    			append_dev(svg, defs);
    			append_dev(defs, clipPath);
    			append_dev(clipPath, rect);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*color*/ 2) {
    				attr_dev(path, "fill", /*color*/ ctx[1]);
    			}

    			if (dirty & /*clazz*/ 1) {
    				attr_dev(svg, "class", /*clazz*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("GithubIcon", slots, []);
    	let { class: clazz = "" } = $$props;
    	let { color = "white" } = $$props;
    	const writable_props = ["class", "color"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<GithubIcon> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, clazz = $$props.class);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    	};

    	$$self.$capture_state = () => ({ clazz, color });

    	$$self.$inject_state = $$props => {
    		if ("clazz" in $$props) $$invalidate(0, clazz = $$props.clazz);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [clazz, color];
    }

    class GithubIcon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, { class: 0, color: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "GithubIcon",
    			options,
    			id: create_fragment$i.name
    		});
    	}

    	get class() {
    		throw new Error("<GithubIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<GithubIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<GithubIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<GithubIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Footer.svelte generated by Svelte v3.38.2 */
    const file$9 = "src/components/Footer.svelte";

    function create_fragment$h(ctx) {
    	let div;
    	let a0;
    	let brandicon;
    	let t0;
    	let t1;
    	let a1;
    	let githubicon;
    	let t2;
    	let t3;
    	let a2;
    	let twittericon;
    	let t4;
    	let current;

    	brandicon = new BrandIcon({
    			props: { class: "sm:h-12 h-8 mr-2" },
    			$$inline: true
    		});

    	githubicon = new GithubIcon({
    			props: { class: "h-8 mr-2" },
    			$$inline: true
    		});

    	twittericon = new TwitterIcon({
    			props: { class: "h-8 mr-2 sm:my-8 my-2" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			a0 = element("a");
    			create_component(brandicon.$$.fragment);
    			t0 = text("\n    Spruce");
    			t1 = space();
    			a1 = element("a");
    			create_component(githubicon.$$.fragment);
    			t2 = text("\n    Github");
    			t3 = space();
    			a2 = element("a");
    			create_component(twittericon.$$.fragment);
    			t4 = text("\n    Twitter");
    			attr_dev(a0, "href", "https://www.spruceid.com/");
    			attr_dev(a0, "class", "flex items-center sm:flex-grow sm:my-8 my-2 font-bold text-4xl");
    			attr_dev(a0, "target", "_blank");
    			add_location(a0, file$9, 7, 2, 244);
    			attr_dev(a1, "class", "flex items-center sm:mr-12 sm:my-8 my-2");
    			attr_dev(a1, "href", "https://github.com/spruceid/");
    			attr_dev(a1, "target", "_blank");
    			add_location(a1, file$9, 15, 2, 446);
    			attr_dev(a2, "class", "flex items-center");
    			attr_dev(a2, "href", "https://twitter.com/sprucesystems/");
    			attr_dev(a2, "target", "_blank");
    			add_location(a2, file$9, 23, 2, 621);
    			attr_dev(div, "class", "items-center text-white sm:flex-row flex-col flex sm:px-12 px-8");
    			add_location(div, file$9, 6, 0, 164);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a0);
    			mount_component(brandicon, a0, null);
    			append_dev(a0, t0);
    			append_dev(div, t1);
    			append_dev(div, a1);
    			mount_component(githubicon, a1, null);
    			append_dev(a1, t2);
    			append_dev(div, t3);
    			append_dev(div, a2);
    			mount_component(twittericon, a2, null);
    			append_dev(a2, t4);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(brandicon.$$.fragment, local);
    			transition_in(githubicon.$$.fragment, local);
    			transition_in(twittericon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(brandicon.$$.fragment, local);
    			transition_out(githubicon.$$.fragment, local);
    			transition_out(twittericon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(brandicon);
    			destroy_component(githubicon);
    			destroy_component(twittericon);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Footer", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ BrandIcon, TwitterIcon, GithubIcon });
    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$h.name
    		});
    	}
    }

    /* src/components/BasePage.svelte generated by Svelte v3.38.2 */
    const file$8 = "src/components/BasePage.svelte";

    function create_fragment$g(ctx) {
    	let div;
    	let div_class_value;
    	let t0;
    	let alert;
    	let t1;
    	let footer;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);
    	alert = new Alert({ $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			t0 = space();
    			create_component(alert.$$.fragment);
    			t1 = space();
    			create_component(footer.$$.fragment);
    			attr_dev(div, "class", div_class_value = "flex flex-grow text-white 2xl:px-16 max-w-full px-8 overflow-hidden-x " + /*clazz*/ ctx[0]);
    			add_location(div, file$8, 6, 0, 141);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			insert_dev(target, t0, anchor);
    			mount_component(alert, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*clazz*/ 1 && div_class_value !== (div_class_value = "flex flex-grow text-white 2xl:px-16 max-w-full px-8 overflow-hidden-x " + /*clazz*/ ctx[0])) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(alert.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			transition_out(alert.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(alert, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(footer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("BasePage", slots, ['default']);
    	let { class: clazz } = $$props;
    	const writable_props = ["class"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<BasePage> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, clazz = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ Alert, Footer, clazz });

    	$$self.$inject_state = $$props => {
    		if ("clazz" in $$props) $$invalidate(0, clazz = $$props.clazz);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [clazz, $$scope, slots];
    }

    class BasePage extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, { class: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BasePage",
    			options,
    			id: create_fragment$g.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*clazz*/ ctx[0] === undefined && !("class" in props)) {
    			console.warn("<BasePage> was created without expected prop 'class'");
    		}
    	}

    	get class() {
    		throw new Error("<BasePage>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<BasePage>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var rdfNxParser = createCommonjsModule(function (module) {
    // ECMAScript 5

    /**
     * @exports parser
     */
    var parser = module.exports;


    /**
     * This implementation relies heavily on regular expressions because they are
     * fast in V8: A lot faster than a previous implementation with a small state
     * machine that parsed the input string in a single scan. (Seems like regexes
     * can be compiled to machine code much more efficiently.)
     *
     * However, if speed is an issue, you should use a compiled parser like e.g.
     * [Raptor] [1] or [nxparser] [2]. Having a parser for Node.js is still great
     * for building tools etc.
     *
     *
     * Objects / typing: I decided to use plain JavaScript objects with a `type`
     * property for tokens instead of creating a constructor (class) for every token
     * type.
     *
     * The N-Triples grammar can be found at:
     * http://www.w3.org/TR/n-triples/#n-triples-grammar
     *
     *
     * [1]: http://librdf.org/raptor/
     * [2]: https://code.google.com/p/nxparser/
     */



    var isCommentedOut = (function () {

    	// Matches a comment (`#`) only at the beginning of a line
    	var regexLeadingComment = /^\s*?#/;

    	return function (text) {
    		return regexLeadingComment.test(text) === true;
    	};
    })();



    /**
     * Internal function to parse a triple or a quad.
     *
     * (Parsing is trivial: Just verify the number of tokens and create an object
     * from the tokens.)
     *
     *
     * @param {String} type  `quad` or `triple`
     *
     * @param {String|Array}  A string to parse or an array of token objects
     *                        (parsed).
     *
     * @param {Object}  [options]  Same options as `#tokenize`
     *
     * @return {Object|String}
     */
    var _parse = (function () {


    	return function (type, input, options) {

    		// Tokenize
    		var tokens;
    		var tokenObjectsPassed = Array.isArray(input);

    		if (tokenObjectsPassed) {
    			tokens = input;
    		}
    		else {
    			if (isCommentedOut(input)) {
    				return null;
    			}

    			tokens = parser.tokenize(input, options);
    		}


    		// Parse tokens

    		var expectedLength = type === 'quad' ? 5 : 4;
    		// includes "end of statement"

    		if (tokens.length !== expectedLength) {
    			return null;
    		}

    		var result = {
    			subject:   tokens[0],
    			predicate: tokens[1],
    			object:    tokens[2]
    		};

    		if (type === 'quad') {
    			result.graphLabel = tokens[3];
    		}

    		return result;
    	};
    })();



    // ---- Unicode handling -------------------------------------------------------

    /**
     * Removes all Unicode escaping from a string.
     *
     * @return {String}
     */
    var unescapeUnicode = (function () {

    	// Matches `\Uxxxxxxxx` or `\uxxxx` (including the prefix)
    	var regex = new RegExp('\\\\U[0-9a-fA-F]{8}|\\\\u[0-9a-fA-F]{4}', 'g');
    	// (Don't use a regex literal here, because there were issues with
    	// `String.prototype.replace` and regex flags in V8.)

    	return function (string) {
    		return string.replace(regex, decodeUcharToken);
    	};
    })();



    /**
     * Unescapes all occurrences of special characters (tabs, backspace, etc.,
     * `ECHAR` tokens in the grammars) in a string.
     *
     *     ECHAR ::= '\' [tbnrf"'\]
     *
     * @param {String}
     * @return {String}
     */
    var unescapeSpecialCharacters = (function() {

    	var regex = /\\([tbnrf"'\\])/g;

    	return function (literalString) {
    		return literalString.replace(regex, '$1');
    	};
    })();



    /**
     * Decodes a single Unicode escape sequence (a UCHAR token in the N-Triples
     * grammar).
     *
     *     UCHAR ::= '\u' HEX HEX HEX HEX | '\U' HEX HEX HEX HEX HEX HEX HEX HEX
     *
     * @param  {String} escapeString    Escaped Unicode string, including the escape
     *                                  sequence (`\U` or `\u`).
     */
    function decodeUcharToken(escapeString) {

    	// This assumes ECMAScript 5, which can't handle Unicode codepoints outside
    	// the Basic Multilingual Plane (BMP) well.
    	//
    	// Workaround: Split "8-digit codepoints" (U+xxxxxxxx) into surrogate pairs.
    	//
    	// Still has some issues, like resulting in a "wrong" string length. See
    	// `https://mathiasbynens.be/notes/javascript-unicode`
    	//
    	// This will be fixed in ECMAScript 6.


    	if (escapeString[1] === 'u') {
    		// `\u`

    		// (Works with BMP codepoints only, U+0000 - U+FFFF.)
    		return String.fromCharCode(Number('0x' + escapeString.slice(2)));
    	}
    	else {
    		// `\U`

    		// Workaround: Split codepoint into surrogate pair, then use
    		// `String.fromCharCode`.
    		var codepoint = parseInt(escapeString.slice(2), 16);

    		if (codepoint <= 0x0000ffff) {
    			// Is only padded, return codepoint from lower half.
    			return String.fromCharCode(
    				Number('0x' + escapeString.slice(6, 10))
    			);
    		}

    		// Convert codepoint to a surrogate pair
    		var h = Math.floor((codepoint - 0x10000) / 0x400) + 0xD800;
    		var l = (codepoint - 0x10000) % 0x400 + 0xDC00;

    		// Now get two characters from BLP codepoints
    		return String.fromCharCode(h, l);
    	}
    	// (Other cases filtered by regex in `unescapeUnicode`.)
    }




    // -----------------------------------------------------------------------------
    //      Exports
    // -----------------------------------------------------------------------------


    /**
     * Tokenizes a string.
     *
     * @param {String}  string   The String to tokenize.
     *
     * @param {Boolean} parsed   Set to `true` to return a parsed (plain JavaScript)
     *                           object.
     *
     * @return {Array}   Array of tokens, either strings or token objects, if
     *                   `parsed` is set to `true`.
     *
     * @param {Object}  [options]
     * @param {Boolean} [options.asStrings=false]
     * @param {Boolean} [options.includeRaw=false]  (If `asStrings` is `false`.)
     * @param {Boolean} [options.unescapeUnicode=true]
     *
     * @see #parseToken
     */
    parser.tokenize = (function () {

    	// This thing does most of this module's work. See `regex.md` for details.
    	var splitTokensRegex = /((?:"[^"\\]*(?:\\.[^"\\]*)*"(?:@\w+(?:-\w+)?|\^\^<[^>]+>)?)|<[^>]+>|\_\:\w+|\.)/g;

    	return function (string, options) {

    		var tokens = string.match(splitTokensRegex);

    		if (!tokens) {
    			return null;
    		}

    		if (!(options && options.asStrings === true)) {
    			// tokens = tokens.map(parser.parseToken);
    			for (var i = 0; i < tokens.length; i++) {
    				tokens[i] = parser.parseToken(tokens[i], options);
    			}
    		}

    		return tokens;
    	};

    })();



    /**
     * Transforms a raw "N-x element" string (part of a triple, quad, …) into a
     * token object (plain JavaScript object).
     *
     * Properties:
     *
     * - `type`: `iri`, `literal`, `blankNode` or `endOfStatement`
     * - `value` (without syntactic elements like brackets, quotes or `_:` prefixes)
     *
     * Optional additional properties for literals:
     *
     * - `language`:    The language tag (`…@language`)
     * - `datatypeIri`: The data type IRI (`…^^<IRI>`)
     *
     *
     * @param {String}  tokenString   Token string to parse.
     *
     * @param {Object}  [options]
     *
     * @param {Boolean} [options.includeRaw=false]
     *                  Keep the string input as property `valueRaw`
     *
     * @param {Boolean} [options.unescapeUnicode=true]
     *                  Decode escaped Unicode in literals.
     */
    parser.parseToken = (function() {

    	// Regex used to test for a literal suffix
    	var regexLiteralSuffix = /\"(.*?)\"((?:@.*)|(?:\^\^<.*>))/;


    	return function (tokenString, options) {
    		var result = {};

    		// Remove leading whitespace, if needed
    		if (tokenString[0] === ' ') {
    			tokenString = tokenString.trim();
    		}

    		if (options && options.includeRaw) {
    			// Also keep the unprocessed string
    			result.valueRaw = tokenString;
    		}

    		var skipUnicodeUnescaping = options &&
    		                            options.unescapeUnicode === false;


    		// Determine type (can be decided by looking at the first character) and
    		// extract value
    		switch (tokenString[0]) {
    			case '<':
    				result.type = 'iri';

    				result.value = tokenString.slice(1, tokenString.length - 1);

    				// Unescape: Only Unicode escapes (UCHAR) are allowed in IRIREF
    				//           tokens, not special character escapes (ECHAR)

    				if (!skipUnicodeUnescaping) {
    					result.value = unescapeUnicode(result.value);
    				}

    				break;


    			case '"':
    				result.type = 'literal';

    				// Check if literal has a suffix: Language tag or data type IRI

    				var matches = tokenString.match(regexLiteralSuffix);
    				if (matches) {
    					result.value  = matches[1];

    					var suffix = matches[2];
    					if (suffix[0] === '@') {
    						result.language = suffix.slice(1);
    					} else {
    						// slice: ^^<…>
    						result.datatypeIri = suffix.slice(3, suffix.length - 1);
    					}
    				} else {
    					result.value = tokenString.slice(1, tokenString.length - 1);
    				}

    				// Unescape

    				result.value = unescapeSpecialCharacters(result.value);

    				if (!skipUnicodeUnescaping) {
    					result.value = unescapeUnicode(result.value);
    				}

    				break;


    			case '_':
    				result.type = 'blankNode';

    				result.value = tokenString.slice(2);  // Remove `_:`
    				break;


    			case '.':
    				result.type = 'endOfStatement';

    				result.value = tokenString;
    				break;
    		}

    		return result;
    	};
    })();



    /**
     * @return {Array}   The set of token types as a string array.
     */
    parser.getTokenTypes = (function () {

    	var tokenTypes = [ 'iri', 'literal', 'blankNode', 'endOfStatement' ];
    	Object.freeze(tokenTypes);

    	return function () {
    		return tokenTypes;
    	};
    })();



    /**
     * Parses a triple from a string.
     *
     * @param {String}  input
     *
     * @param {Object}  [options]
     * @param {Boolean} [options.asStrings=false]
     * @param {Boolean} [options.includeRaw=false]  (Ignored if `parsed` is `false`)
     * @param {Boolean} [options.unescapeUnicode=true]
     *
     * @return {Object|null}
     */
    parser.parseTriple = function (input, options) {

    	return _parse('triple', input, options);
    };



    /**
     * Parses a quad from a string.
     *
     * @param {String}  input
     *
     * @param {Object}  [options]
     * @param {Boolean} [options.asStrings=false]
     * @param {Boolean} [options.includeRaw=false]  (Ignored if `parsed` is `false`)
     * @param {Boolean} [options.unescapeUnicode=true]
     *
     * @return {Object|null}
     */
    parser.parseQuad = function (input, options) {

    	return _parse('quad', input, options);
    };
    });

    function parseQuad(line) {
        let tokens = rdfNxParser.tokenize(line);
        if (tokens.length !== 4 && tokens.length !== 5) {
            console.error(line, tokens);
            throw new Error("Expected 3 or 4 tokens for line but found: " + tokens.length);
        }
        const lastToken = tokens.pop();
        if (!lastToken || lastToken.type !== "endOfStatement") {
            console.error(line, tokens, lastToken);
            throw new Error("Missing end of statement");
        }
        const statement = {
            subject: tokens[0],
            predicate: tokens[1],
            object: tokens[2],
            graph: tokens[3],
        };
        return statement;
    }
    function renderLiteral(term) {
        switch (term.datatypeIri) {
            case "http://www.w3.org/2001/XMLSchema#dateTime":
                return new Date(term.value).toString();
            case "http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON":
                return term.value;
            case undefined:
                return term.value;
        }
        return {
            type: term.datatypeIri,
            value: term.value,
        };
    }
    function renderTerm(term) {
        switch (term.type) {
            case "blankNode":
                return `_:${term.value}`;
            case "iri":
                return term.value;
            case "literal":
                return renderLiteral(term);
            default:
                return JSON.stringify(term);
        }
    }
    function renderStatement(statement) {
        const row = [];
        row.push(renderTerm(statement.subject));
        row.push(renderTerm(statement.predicate));
        row.push(renderTerm(statement.object));
        if (statement.graph) {
            row.push(statement.graph);
        }
        return row;
    }
    const parse = (vc) => {
        if (!vc)
            return;
        let el;
        try {
            el = renderInput(vc.trim());
        }
        catch (e) {
            alert.set({
                message: e.message,
                variant: "error",
            });
        }
        output.set(el);
    };
    function renderInput(input) {
        let json;
        try {
            json = JSON.parse(`"${input}"`);
        }
        catch (e) {
            throw new Error(`Unable to parse JSON: ${e.message}`);
        }
        if (typeof json !== "string") {
            throw new Error(`Expected string but found: ${typeof json}.`);
        }
        if (!/^Tezos Signed Message: \n/.test(json)) {
            throw new Error(`Unexpected message format. Expected: Tezos Signed Message: \n, found: \
      ${json.substring(24)}.`);
        }
        const parts = json.substr(23).split(/\n\n/);
        if (parts.length !== 2) {
            throw new Error(`Expected two parts but found: ${parts.length}`);
        }
        const [proofNquads, docNquads] = parts;
        const docLines = docNquads.split(/\n/);
        const lastLine = docLines.pop();
        if (lastLine !== "") {
            throw new Error(`Expected empty last line, but found: ${JSON.stringify(lastLine)}`);
        }
        const proofLines = proofNquads.split(/\n/);
        const proofStatements = proofLines.map(parseQuad);
        const docStatements = docLines.map(parseQuad);
        return {
            rdf: renderRdfLdpTable(proofStatements, docStatements),
            nquads: { proofNquads, docNquads },
            content: renderRdfLdpContent(proofStatements, docStatements),
        };
    }
    function renderRdfLdpTable(proofStatements, docStatements) {
        return {
            document: renderRdfDatasetTable(docStatements),
            proofOptions: renderRdfDatasetTable(proofStatements),
        };
    }
    function renderRdfDatasetTable(statements) {
        let hasGraph = false;
        for (const statement of statements) {
            if (statement.graph) {
                hasGraph = true;
                break;
            }
        }
        const headers = [];
        const body = [];
        headers.push("Subject");
        headers.push("Predicate");
        headers.push("Object");
        if (hasGraph) {
            headers.push("Graph");
        }
        for (const statement of statements) {
            body.push(renderStatement(statement));
        }
        return {
            headers,
            body,
        };
    }
    function renderDateFull(object) {
        if (object.type !== "literal") {
            throw new Error(`Expected literal, got: ${object.type}`);
        }
        if (object.datatypeIri !== "http://www.w3.org/2001/XMLSchema#dateTime") {
            throw new Error(`Expected http://www.w3.org/2001/XMLSchema#dateTime, got ${object.datatypeIri}`);
        }
        return new Date(object.value).toUTCString();
    }
    function renderCreated(object) {
        return {
            created: renderDateFull(object),
        };
    }
    function renderProofPurpose(object) {
        switch (object.value) {
            case "https://w3id.org/security#assertionMethod":
                return { purpose: "Assertion" };
            default:
                return { unknown: object.value };
        }
    }
    function renderId(object) {
        return { id: renderTerm(object) };
    }
    function renderType(object) {
        if (object.type !== "iri") {
            throw new Error("Expected IRI");
        }
        switch (object.value) {
            case "https://w3id.org/security#TezosSignature2021":
                return { type: "Tezos Signature 2021" };
            case "https://www.w3.org/2018/credentials#VerifiableCredential":
                return { type: "Verifiable Credential" };
            case "https://tzprofiles.com/BasicProfile":
                return { type: "Tezos Profile (tzprofiles.com)" };
            default:
                return { type: `Unkown type: ${object.value}` };
        }
    }
    function renderVerificationMethod(object) {
        return { verificationMethod: renderTerm(object) };
    }
    function renderPublicKeyJwk(object) {
        const pk = renderTerm(object);
        return {
            publicKey: pk,
        };
    }
    function renderIssuer(object) {
        return { issuer: renderTerm(object) };
    }
    function renderIssuanceDate(object) {
        return { issuanceDate: renderDateFull(object) };
    }
    function renderDescription(object) {
        return { description: renderTerm(object) };
    }
    function renderName(object) {
        return { name: renderTerm(object) };
    }
    function renderLogo(object) {
        return { logo: renderTerm(object) };
    }
    function renderURL(object) {
        return { url: renderTerm(object) };
    }
    function renderCredentialSubjectStatement(stmt) {
        if (stmt.predicate.type !== "iri") {
            throw new Error("Expected predicate IRI");
        }
        if (stmt.graph) {
            throw new Error("Expected default graph");
        }
        const predicateIRI = stmt.predicate.value;
        switch (predicateIRI) {
            case "https://schema.org/description":
                return renderDescription(stmt.object);
            case "https://schema.org/logo":
                return renderLogo(stmt.object);
            case "https://schema.org/name":
                return renderName(stmt.object);
            case "https://schema.org/url":
                return renderURL(stmt.object);
            default:
                throw new Error(`Unknown Predicate: ${predicateIRI}.`);
        }
    }
    function renderCredentialSubject(object, statements) {
        const elements = [];
        const subjectStatements = takeStatements(statements, (statement) => {
            return isTermEqual(statement.subject, object);
        });
        elements.push({ "": subjectStatements[0].subject.value });
        for (const statement of subjectStatements) {
            elements.push(renderCredentialSubjectStatement(statement));
        }
        return { credentialSubject: Object.assign.apply(Object, elements) };
    }
    function renderProofOptionStatement(stmt) {
        if (stmt.subject.type !== "blankNode" || stmt.subject.value !== "c14n0") {
            throw new Error("Expected single blank node subject");
        }
        if (stmt.predicate.type !== "iri") {
            throw new Error("Expected predicate IRI");
        }
        if (stmt.graph) {
            throw new Error("Expected default graph");
        }
        const predicateIRI = stmt.predicate.value;
        switch (predicateIRI) {
            case "http://purl.org/dc/terms/created":
                return renderCreated(stmt.object);
            case "http://www.w3.org/1999/02/22-rdf-syntax-ns#type":
                return renderType(stmt.object);
            case "https://w3id.org/security#proofPurpose":
                return renderProofPurpose(stmt.object);
            case "https://w3id.org/security#verificationMethod":
                return renderVerificationMethod(stmt.object);
            case "https://w3id.org/security#publicKeyJwk":
                return renderPublicKeyJwk(stmt.object);
            default:
                throw new Error(`Unknown Predicate: ${predicateIRI}`);
        }
    }
    function renderVerifiableCredentialStatement(stmt, statements) {
        if (stmt.predicate.type !== "iri") {
            throw new Error("Expected predicate IRI");
        }
        if (stmt.graph) {
            throw new Error("Expected default graph");
        }
        const predicateIRI = stmt.predicate.value;
        switch (predicateIRI) {
            case "https://www.w3.org/2018/credentials#credentialSubject":
                return renderCredentialSubject(stmt.object, statements);
            case "http://www.w3.org/1999/02/22-rdf-syntax-ns#type":
                return renderType(stmt.object);
            case "https://www.w3.org/2018/credentials#issuer":
                return renderIssuer(stmt.object);
            case "https://www.w3.org/2018/credentials#issuanceDate":
                return renderIssuanceDate(stmt.object);
            default:
                throw new Error(`Unknown Predicate: ${predicateIRI}`);
        }
    }
    function renderProofOptions(statements) {
        const elements = [];
        for (const statement of statements) {
            elements.push(renderProofOptionStatement(statement));
        }
        return Object.assign.apply(Object, elements);
    }
    function takeStatements(statements, filter) {
        const results = [];
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            if (filter(stmt, i)) {
                results.push(stmt);
                statements.splice(i, 1);
                i--;
            }
        }
        return results;
    }
    function isTermEqual(a, b) {
        if (a == null) {
            return b == null;
        }
        if (a.type === "iri") {
            return b.type === "iri" && a.value === b.value;
        }
        if (a.type === "blankNode") {
            return b.type === "blankNode" && a.value === b.value;
        }
        throw new Error("Expected IRI or blank node id");
    }
    function renderVerifiableCredential(subject, statements) {
        const el = [];
        const vcStatements = takeStatements(statements, (statement) => {
            return isTermEqual(statement.subject, subject);
        });
        if (subject.type === "iri") {
            el.push(renderId(subject));
        }
        for (const statement of vcStatements) {
            el.push(renderVerifiableCredentialStatement(statement, statements));
        }
        return Object.assign.apply(Object, el);
    }
    function renderLDDocument(statements) {
        const el = document.createElement("div");
        el.className = "document";
        const vcTypeStatements = takeStatements(statements, (statement) => {
            return (statement.predicate.type === "iri" &&
                statement.predicate.value ===
                    "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" &&
                statement.object.type === "iri" &&
                statement.object.value ===
                    "https://www.w3.org/2018/credentials#VerifiableCredential");
        });
        // TODO: support VerifiablePresentation
        if (vcTypeStatements.length === 0) {
            throw new Error("Missing VerifiableCredential");
        }
        if (vcTypeStatements.length > 1) {
            throw new Error("More than one VerifiableCredential");
        }
        const subject = vcTypeStatements[0].subject;
        return {
            verifiableCredential: renderVerifiableCredential(subject, statements),
            unkown: renderRdfDatasetTable(statements),
        };
    }
    function renderRdfLdpContent(proofStatements, docStatements) {
        return {
            verifiableCredential: renderLDDocument(docStatements).verifiableCredential,
            proofOptions: renderProofOptions(proofStatements),
        };
    }

    var contextKey = {};

    /* node_modules/svelte-json-tree/src/JSONArrow.svelte generated by Svelte v3.38.2 */

    const file$7 = "node_modules/svelte-json-tree/src/JSONArrow.svelte";

    function create_fragment$f(ctx) {
    	let div1;
    	let div0;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = `${"▶"}`;
    			attr_dev(div0, "class", "arrow svelte-1wnzwpq");
    			toggle_class(div0, "expanded", /*expanded*/ ctx[0]);
    			add_location(div0, file$7, 29, 2, 578);
    			attr_dev(div1, "class", "container svelte-1wnzwpq");
    			add_location(div1, file$7, 28, 0, 543);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			if (!mounted) {
    				dispose = listen_dev(div1, "click", /*click_handler*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*expanded*/ 1) {
    				toggle_class(div0, "expanded", /*expanded*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("JSONArrow", slots, []);
    	let { expanded } = $$props;
    	const writable_props = ["expanded"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONArrow> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("expanded" in $$props) $$invalidate(0, expanded = $$props.expanded);
    	};

    	$$self.$capture_state = () => ({ expanded });

    	$$self.$inject_state = $$props => {
    		if ("expanded" in $$props) $$invalidate(0, expanded = $$props.expanded);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [expanded, click_handler];
    }

    class JSONArrow extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, { expanded: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONArrow",
    			options,
    			id: create_fragment$f.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*expanded*/ ctx[0] === undefined && !("expanded" in props)) {
    			console.warn("<JSONArrow> was created without expected prop 'expanded'");
    		}
    	}

    	get expanded() {
    		throw new Error("<JSONArrow>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set expanded(value) {
    		throw new Error("<JSONArrow>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-json-tree/src/JSONKey.svelte generated by Svelte v3.38.2 */

    const file$6 = "node_modules/svelte-json-tree/src/JSONKey.svelte";

    // (15:0) {#if showKey && key}
    function create_if_block$4(ctx) {
    	let label;
    	let span;
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			span = element("span");
    			t0 = text(/*key*/ ctx[0]);
    			t1 = text(/*colon*/ ctx[2]);
    			add_location(span, file$6, 16, 4, 382);
    			attr_dev(label, "class", "svelte-1ellb4");
    			toggle_class(label, "spaced", /*isParentExpanded*/ ctx[1]);
    			add_location(label, file$6, 15, 2, 329);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, span);
    			append_dev(span, t0);
    			append_dev(span, t1);

    			if (!mounted) {
    				dispose = listen_dev(label, "click", /*click_handler*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*key*/ 1) set_data_dev(t0, /*key*/ ctx[0]);
    			if (dirty & /*colon*/ 4) set_data_dev(t1, /*colon*/ ctx[2]);

    			if (dirty & /*isParentExpanded*/ 2) {
    				toggle_class(label, "spaced", /*isParentExpanded*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(15:0) {#if showKey && key}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let if_block_anchor;
    	let if_block = /*showKey*/ ctx[3] && /*key*/ ctx[0] && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*showKey*/ ctx[3] && /*key*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let showKey;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("JSONKey", slots, []);

    	let { key } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray = false } = $$props,
    		{ colon = ":" } = $$props;

    	const writable_props = ["key", "isParentExpanded", "isParentArray", "colon"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONKey> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(4, isParentArray = $$props.isParentArray);
    		if ("colon" in $$props) $$invalidate(2, colon = $$props.colon);
    	};

    	$$self.$capture_state = () => ({
    		key,
    		isParentExpanded,
    		isParentArray,
    		colon,
    		showKey
    	});

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(4, isParentArray = $$props.isParentArray);
    		if ("colon" in $$props) $$invalidate(2, colon = $$props.colon);
    		if ("showKey" in $$props) $$invalidate(3, showKey = $$props.showKey);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*isParentExpanded, isParentArray, key*/ 19) {
    			$$invalidate(3, showKey = isParentExpanded || !isParentArray || key != +key);
    		}
    	};

    	return [key, isParentExpanded, colon, showKey, isParentArray, click_handler];
    }

    class JSONKey extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {
    			key: 0,
    			isParentExpanded: 1,
    			isParentArray: 4,
    			colon: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONKey",
    			options,
    			id: create_fragment$e.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*key*/ ctx[0] === undefined && !("key" in props)) {
    			console.warn("<JSONKey> was created without expected prop 'key'");
    		}

    		if (/*isParentExpanded*/ ctx[1] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONKey> was created without expected prop 'isParentExpanded'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONKey>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONKey>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONKey>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONKey>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONKey>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONKey>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get colon() {
    		throw new Error("<JSONKey>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colon(value) {
    		throw new Error("<JSONKey>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-json-tree/src/JSONNested.svelte generated by Svelte v3.38.2 */
    const file$5 = "node_modules/svelte-json-tree/src/JSONNested.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	child_ctx[20] = i;
    	return child_ctx;
    }

    // (58:4) {#if expandable && isParentExpanded}
    function create_if_block_3$1(ctx) {
    	let jsonarrow;
    	let current;

    	jsonarrow = new JSONArrow({
    			props: { expanded: /*expanded*/ ctx[0] },
    			$$inline: true
    		});

    	jsonarrow.$on("click", /*toggleExpand*/ ctx[15]);

    	const block = {
    		c: function create() {
    			create_component(jsonarrow.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonarrow, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const jsonarrow_changes = {};
    			if (dirty & /*expanded*/ 1) jsonarrow_changes.expanded = /*expanded*/ ctx[0];
    			jsonarrow.$set(jsonarrow_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonarrow.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonarrow.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonarrow, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(58:4) {#if expandable && isParentExpanded}",
    		ctx
    	});

    	return block;
    }

    // (76:4) {:else}
    function create_else_block$2(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "…";
    			add_location(span, file$5, 76, 6, 2048);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(76:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (64:4) {#if isParentExpanded}
    function create_if_block$3(ctx) {
    	let ul;
    	let t;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*slicedKeys*/ ctx[13];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block = /*slicedKeys*/ ctx[13].length < /*previewKeys*/ ctx[7].length && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(ul, "class", "svelte-1m3z1hh");
    			toggle_class(ul, "collapse", !/*expanded*/ ctx[0]);
    			add_location(ul, file$5, 64, 6, 1552);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(ul, t);
    			if (if_block) if_block.m(ul, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(ul, "click", /*expand*/ ctx[16], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*expanded, previewKeys, getKey, slicedKeys, isArray, getValue, getPreviewValue*/ 10129) {
    				each_value = /*slicedKeys*/ ctx[13];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul, t);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (/*slicedKeys*/ ctx[13].length < /*previewKeys*/ ctx[7].length) {
    				if (if_block) ; else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					if_block.m(ul, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*expanded*/ 1) {
    				toggle_class(ul, "collapse", !/*expanded*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(64:4) {#if isParentExpanded}",
    		ctx
    	});

    	return block;
    }

    // (68:10) {#if !expanded && index < previewKeys.length - 1}
    function create_if_block_2$2(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = ",";
    			attr_dev(span, "class", "comma svelte-1m3z1hh");
    			add_location(span, file$5, 68, 12, 1864);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(68:10) {#if !expanded && index < previewKeys.length - 1}",
    		ctx
    	});

    	return block;
    }

    // (66:8) {#each slicedKeys as key, index}
    function create_each_block$2(ctx) {
    	let jsonnode;
    	let t;
    	let if_block_anchor;
    	let current;

    	jsonnode = new JSONNode({
    			props: {
    				key: /*getKey*/ ctx[8](/*key*/ ctx[12]),
    				isParentExpanded: /*expanded*/ ctx[0],
    				isParentArray: /*isArray*/ ctx[4],
    				value: /*expanded*/ ctx[0]
    				? /*getValue*/ ctx[9](/*key*/ ctx[12])
    				: /*getPreviewValue*/ ctx[10](/*key*/ ctx[12])
    			},
    			$$inline: true
    		});

    	let if_block = !/*expanded*/ ctx[0] && /*index*/ ctx[20] < /*previewKeys*/ ctx[7].length - 1 && create_if_block_2$2(ctx);

    	const block = {
    		c: function create() {
    			create_component(jsonnode.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonnode, target, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const jsonnode_changes = {};
    			if (dirty & /*getKey, slicedKeys*/ 8448) jsonnode_changes.key = /*getKey*/ ctx[8](/*key*/ ctx[12]);
    			if (dirty & /*expanded*/ 1) jsonnode_changes.isParentExpanded = /*expanded*/ ctx[0];
    			if (dirty & /*isArray*/ 16) jsonnode_changes.isParentArray = /*isArray*/ ctx[4];

    			if (dirty & /*expanded, getValue, slicedKeys, getPreviewValue*/ 9729) jsonnode_changes.value = /*expanded*/ ctx[0]
    			? /*getValue*/ ctx[9](/*key*/ ctx[12])
    			: /*getPreviewValue*/ ctx[10](/*key*/ ctx[12]);

    			jsonnode.$set(jsonnode_changes);

    			if (!/*expanded*/ ctx[0] && /*index*/ ctx[20] < /*previewKeys*/ ctx[7].length - 1) {
    				if (if_block) ; else {
    					if_block = create_if_block_2$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonnode.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonnode.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonnode, detaching);
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(66:8) {#each slicedKeys as key, index}",
    		ctx
    	});

    	return block;
    }

    // (72:8) {#if slicedKeys.length < previewKeys.length }
    function create_if_block_1$2(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "…";
    			add_location(span, file$5, 72, 10, 1989);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(72:8) {#if slicedKeys.length < previewKeys.length }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$d(ctx) {
    	let li;
    	let label_1;
    	let t0;
    	let jsonkey;
    	let t1;
    	let span1;
    	let span0;
    	let t2;
    	let t3;
    	let t4;
    	let current_block_type_index;
    	let if_block1;
    	let t5;
    	let span2;
    	let t6;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*expandable*/ ctx[11] && /*isParentExpanded*/ ctx[2] && create_if_block_3$1(ctx);

    	jsonkey = new JSONKey({
    			props: {
    				key: /*key*/ ctx[12],
    				colon: /*context*/ ctx[14].colon,
    				isParentExpanded: /*isParentExpanded*/ ctx[2],
    				isParentArray: /*isParentArray*/ ctx[3]
    			},
    			$$inline: true
    		});

    	jsonkey.$on("click", /*toggleExpand*/ ctx[15]);
    	const if_block_creators = [create_if_block$3, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*isParentExpanded*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			li = element("li");
    			label_1 = element("label");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			create_component(jsonkey.$$.fragment);
    			t1 = space();
    			span1 = element("span");
    			span0 = element("span");
    			t2 = text(/*label*/ ctx[1]);
    			t3 = text(/*bracketOpen*/ ctx[5]);
    			t4 = space();
    			if_block1.c();
    			t5 = space();
    			span2 = element("span");
    			t6 = text(/*bracketClose*/ ctx[6]);
    			add_location(span0, file$5, 61, 34, 1467);
    			add_location(span1, file$5, 61, 4, 1437);
    			attr_dev(label_1, "class", "svelte-1m3z1hh");
    			add_location(label_1, file$5, 56, 2, 1216);
    			add_location(span2, file$5, 78, 2, 2075);
    			attr_dev(li, "class", "svelte-1m3z1hh");
    			toggle_class(li, "indent", /*isParentExpanded*/ ctx[2]);
    			add_location(li, file$5, 55, 0, 1177);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, label_1);
    			if (if_block0) if_block0.m(label_1, null);
    			append_dev(label_1, t0);
    			mount_component(jsonkey, label_1, null);
    			append_dev(label_1, t1);
    			append_dev(label_1, span1);
    			append_dev(span1, span0);
    			append_dev(span0, t2);
    			append_dev(span1, t3);
    			append_dev(li, t4);
    			if_blocks[current_block_type_index].m(li, null);
    			append_dev(li, t5);
    			append_dev(li, span2);
    			append_dev(span2, t6);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(span1, "click", /*toggleExpand*/ ctx[15], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*expandable*/ ctx[11] && /*isParentExpanded*/ ctx[2]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*expandable, isParentExpanded*/ 2052) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_3$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(label_1, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			const jsonkey_changes = {};
    			if (dirty & /*key*/ 4096) jsonkey_changes.key = /*key*/ ctx[12];
    			if (dirty & /*isParentExpanded*/ 4) jsonkey_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
    			if (dirty & /*isParentArray*/ 8) jsonkey_changes.isParentArray = /*isParentArray*/ ctx[3];
    			jsonkey.$set(jsonkey_changes);
    			if (!current || dirty & /*label*/ 2) set_data_dev(t2, /*label*/ ctx[1]);
    			if (!current || dirty & /*bracketOpen*/ 32) set_data_dev(t3, /*bracketOpen*/ ctx[5]);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block1 = if_blocks[current_block_type_index];

    				if (!if_block1) {
    					if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block1.c();
    				} else {
    					if_block1.p(ctx, dirty);
    				}

    				transition_in(if_block1, 1);
    				if_block1.m(li, t5);
    			}

    			if (!current || dirty & /*bracketClose*/ 64) set_data_dev(t6, /*bracketClose*/ ctx[6]);

    			if (dirty & /*isParentExpanded*/ 4) {
    				toggle_class(li, "indent", /*isParentExpanded*/ ctx[2]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(jsonkey.$$.fragment, local);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(jsonkey.$$.fragment, local);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			if (if_block0) if_block0.d();
    			destroy_component(jsonkey);
    			if_blocks[current_block_type_index].d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let slicedKeys;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("JSONNested", slots, []);

    	let { key } = $$props,
    		{ keys } = $$props,
    		{ colon = ":" } = $$props,
    		{ label = "" } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props,
    		{ isArray = false } = $$props,
    		{ bracketOpen } = $$props,
    		{ bracketClose } = $$props;

    	let { previewKeys = keys } = $$props;
    	let { getKey = key => key } = $$props;
    	let { getValue = key => key } = $$props;
    	let { getPreviewValue = getValue } = $$props;
    	let { expanded = false } = $$props, { expandable = true } = $$props;
    	const context = getContext(contextKey);
    	setContext(contextKey, { ...context, colon });

    	function toggleExpand() {
    		$$invalidate(0, expanded = !expanded);
    	}

    	function expand() {
    		$$invalidate(0, expanded = true);
    	}

    	const writable_props = [
    		"key",
    		"keys",
    		"colon",
    		"label",
    		"isParentExpanded",
    		"isParentArray",
    		"isArray",
    		"bracketOpen",
    		"bracketClose",
    		"previewKeys",
    		"getKey",
    		"getValue",
    		"getPreviewValue",
    		"expanded",
    		"expandable"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONNested> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("key" in $$props) $$invalidate(12, key = $$props.key);
    		if ("keys" in $$props) $$invalidate(17, keys = $$props.keys);
    		if ("colon" in $$props) $$invalidate(18, colon = $$props.colon);
    		if ("label" in $$props) $$invalidate(1, label = $$props.label);
    		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
    		if ("isArray" in $$props) $$invalidate(4, isArray = $$props.isArray);
    		if ("bracketOpen" in $$props) $$invalidate(5, bracketOpen = $$props.bracketOpen);
    		if ("bracketClose" in $$props) $$invalidate(6, bracketClose = $$props.bracketClose);
    		if ("previewKeys" in $$props) $$invalidate(7, previewKeys = $$props.previewKeys);
    		if ("getKey" in $$props) $$invalidate(8, getKey = $$props.getKey);
    		if ("getValue" in $$props) $$invalidate(9, getValue = $$props.getValue);
    		if ("getPreviewValue" in $$props) $$invalidate(10, getPreviewValue = $$props.getPreviewValue);
    		if ("expanded" in $$props) $$invalidate(0, expanded = $$props.expanded);
    		if ("expandable" in $$props) $$invalidate(11, expandable = $$props.expandable);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		setContext,
    		contextKey,
    		JSONArrow,
    		JSONNode,
    		JSONKey,
    		key,
    		keys,
    		colon,
    		label,
    		isParentExpanded,
    		isParentArray,
    		isArray,
    		bracketOpen,
    		bracketClose,
    		previewKeys,
    		getKey,
    		getValue,
    		getPreviewValue,
    		expanded,
    		expandable,
    		context,
    		toggleExpand,
    		expand,
    		slicedKeys
    	});

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(12, key = $$props.key);
    		if ("keys" in $$props) $$invalidate(17, keys = $$props.keys);
    		if ("colon" in $$props) $$invalidate(18, colon = $$props.colon);
    		if ("label" in $$props) $$invalidate(1, label = $$props.label);
    		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
    		if ("isArray" in $$props) $$invalidate(4, isArray = $$props.isArray);
    		if ("bracketOpen" in $$props) $$invalidate(5, bracketOpen = $$props.bracketOpen);
    		if ("bracketClose" in $$props) $$invalidate(6, bracketClose = $$props.bracketClose);
    		if ("previewKeys" in $$props) $$invalidate(7, previewKeys = $$props.previewKeys);
    		if ("getKey" in $$props) $$invalidate(8, getKey = $$props.getKey);
    		if ("getValue" in $$props) $$invalidate(9, getValue = $$props.getValue);
    		if ("getPreviewValue" in $$props) $$invalidate(10, getPreviewValue = $$props.getPreviewValue);
    		if ("expanded" in $$props) $$invalidate(0, expanded = $$props.expanded);
    		if ("expandable" in $$props) $$invalidate(11, expandable = $$props.expandable);
    		if ("slicedKeys" in $$props) $$invalidate(13, slicedKeys = $$props.slicedKeys);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*isParentExpanded*/ 4) {
    			if (!isParentExpanded) {
    				$$invalidate(0, expanded = false);
    			}
    		}

    		if ($$self.$$.dirty & /*expanded, keys, previewKeys*/ 131201) {
    			$$invalidate(13, slicedKeys = expanded ? keys : previewKeys.slice(0, 5));
    		}
    	};

    	return [
    		expanded,
    		label,
    		isParentExpanded,
    		isParentArray,
    		isArray,
    		bracketOpen,
    		bracketClose,
    		previewKeys,
    		getKey,
    		getValue,
    		getPreviewValue,
    		expandable,
    		key,
    		slicedKeys,
    		context,
    		toggleExpand,
    		expand,
    		keys,
    		colon
    	];
    }

    class JSONNested extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {
    			key: 12,
    			keys: 17,
    			colon: 18,
    			label: 1,
    			isParentExpanded: 2,
    			isParentArray: 3,
    			isArray: 4,
    			bracketOpen: 5,
    			bracketClose: 6,
    			previewKeys: 7,
    			getKey: 8,
    			getValue: 9,
    			getPreviewValue: 10,
    			expanded: 0,
    			expandable: 11
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONNested",
    			options,
    			id: create_fragment$d.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*key*/ ctx[12] === undefined && !("key" in props)) {
    			console.warn("<JSONNested> was created without expected prop 'key'");
    		}

    		if (/*keys*/ ctx[17] === undefined && !("keys" in props)) {
    			console.warn("<JSONNested> was created without expected prop 'keys'");
    		}

    		if (/*isParentExpanded*/ ctx[2] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONNested> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[3] === undefined && !("isParentArray" in props)) {
    			console.warn("<JSONNested> was created without expected prop 'isParentArray'");
    		}

    		if (/*bracketOpen*/ ctx[5] === undefined && !("bracketOpen" in props)) {
    			console.warn("<JSONNested> was created without expected prop 'bracketOpen'");
    		}

    		if (/*bracketClose*/ ctx[6] === undefined && !("bracketClose" in props)) {
    			console.warn("<JSONNested> was created without expected prop 'bracketClose'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get keys() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set keys(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get colon() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colon(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isArray() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isArray(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bracketOpen() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bracketOpen(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bracketClose() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bracketClose(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get previewKeys() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set previewKeys(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getKey() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getKey(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getValue() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getValue(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getPreviewValue() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getPreviewValue(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get expanded() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set expanded(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get expandable() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set expandable(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-json-tree/src/JSONObjectNode.svelte generated by Svelte v3.38.2 */

    const { Object: Object_1$2 } = globals;

    function create_fragment$c(ctx) {
    	let jsonnested;
    	let current;

    	jsonnested = new JSONNested({
    			props: {
    				key: /*key*/ ctx[0],
    				expanded: /*expanded*/ ctx[4],
    				isParentExpanded: /*isParentExpanded*/ ctx[1],
    				isParentArray: /*isParentArray*/ ctx[2],
    				keys: /*keys*/ ctx[5],
    				previewKeys: /*keys*/ ctx[5],
    				getValue: /*getValue*/ ctx[6],
    				label: "" + (/*nodeType*/ ctx[3] + " "),
    				bracketOpen: "{",
    				bracketClose: "}"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(jsonnested.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonnested, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const jsonnested_changes = {};
    			if (dirty & /*key*/ 1) jsonnested_changes.key = /*key*/ ctx[0];
    			if (dirty & /*expanded*/ 16) jsonnested_changes.expanded = /*expanded*/ ctx[4];
    			if (dirty & /*isParentExpanded*/ 2) jsonnested_changes.isParentExpanded = /*isParentExpanded*/ ctx[1];
    			if (dirty & /*isParentArray*/ 4) jsonnested_changes.isParentArray = /*isParentArray*/ ctx[2];
    			if (dirty & /*keys*/ 32) jsonnested_changes.keys = /*keys*/ ctx[5];
    			if (dirty & /*keys*/ 32) jsonnested_changes.previewKeys = /*keys*/ ctx[5];
    			if (dirty & /*nodeType*/ 8) jsonnested_changes.label = "" + (/*nodeType*/ ctx[3] + " ");
    			jsonnested.$set(jsonnested_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonnested.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonnested.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonnested, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let keys;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("JSONObjectNode", slots, []);

    	let { key } = $$props,
    		{ value } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props,
    		{ nodeType } = $$props;

    	let { expanded = false } = $$props;

    	function getValue(key) {
    		return value[key];
    	}

    	const writable_props = ["key", "value", "isParentExpanded", "isParentArray", "nodeType", "expanded"];

    	Object_1$2.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONObjectNode> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(7, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(2, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(3, nodeType = $$props.nodeType);
    		if ("expanded" in $$props) $$invalidate(4, expanded = $$props.expanded);
    	};

    	$$self.$capture_state = () => ({
    		JSONNested,
    		key,
    		value,
    		isParentExpanded,
    		isParentArray,
    		nodeType,
    		expanded,
    		getValue,
    		keys
    	});

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(7, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(2, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(3, nodeType = $$props.nodeType);
    		if ("expanded" in $$props) $$invalidate(4, expanded = $$props.expanded);
    		if ("keys" in $$props) $$invalidate(5, keys = $$props.keys);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 128) {
    			$$invalidate(5, keys = Object.getOwnPropertyNames(value));
    		}
    	};

    	return [
    		key,
    		isParentExpanded,
    		isParentArray,
    		nodeType,
    		expanded,
    		keys,
    		getValue,
    		value
    	];
    }

    class JSONObjectNode extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {
    			key: 0,
    			value: 7,
    			isParentExpanded: 1,
    			isParentArray: 2,
    			nodeType: 3,
    			expanded: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONObjectNode",
    			options,
    			id: create_fragment$c.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*key*/ ctx[0] === undefined && !("key" in props)) {
    			console.warn("<JSONObjectNode> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[7] === undefined && !("value" in props)) {
    			console.warn("<JSONObjectNode> was created without expected prop 'value'");
    		}

    		if (/*isParentExpanded*/ ctx[1] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONObjectNode> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[2] === undefined && !("isParentArray" in props)) {
    			console.warn("<JSONObjectNode> was created without expected prop 'isParentArray'");
    		}

    		if (/*nodeType*/ ctx[3] === undefined && !("nodeType" in props)) {
    			console.warn("<JSONObjectNode> was created without expected prop 'nodeType'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONObjectNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONObjectNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<JSONObjectNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<JSONObjectNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONObjectNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONObjectNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONObjectNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONObjectNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get nodeType() {
    		throw new Error("<JSONObjectNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nodeType(value) {
    		throw new Error("<JSONObjectNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get expanded() {
    		throw new Error("<JSONObjectNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set expanded(value) {
    		throw new Error("<JSONObjectNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-json-tree/src/JSONArrayNode.svelte generated by Svelte v3.38.2 */

    const { Object: Object_1$1 } = globals;

    function create_fragment$b(ctx) {
    	let jsonnested;
    	let current;

    	jsonnested = new JSONNested({
    			props: {
    				key: /*key*/ ctx[0],
    				expanded: /*expanded*/ ctx[4],
    				isParentExpanded: /*isParentExpanded*/ ctx[2],
    				isParentArray: /*isParentArray*/ ctx[3],
    				isArray: true,
    				keys: /*keys*/ ctx[5],
    				previewKeys: /*previewKeys*/ ctx[6],
    				getValue: /*getValue*/ ctx[7],
    				label: "Array(" + /*value*/ ctx[1].length + ")",
    				bracketOpen: "[",
    				bracketClose: "]"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(jsonnested.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonnested, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const jsonnested_changes = {};
    			if (dirty & /*key*/ 1) jsonnested_changes.key = /*key*/ ctx[0];
    			if (dirty & /*expanded*/ 16) jsonnested_changes.expanded = /*expanded*/ ctx[4];
    			if (dirty & /*isParentExpanded*/ 4) jsonnested_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
    			if (dirty & /*isParentArray*/ 8) jsonnested_changes.isParentArray = /*isParentArray*/ ctx[3];
    			if (dirty & /*keys*/ 32) jsonnested_changes.keys = /*keys*/ ctx[5];
    			if (dirty & /*previewKeys*/ 64) jsonnested_changes.previewKeys = /*previewKeys*/ ctx[6];
    			if (dirty & /*value*/ 2) jsonnested_changes.label = "Array(" + /*value*/ ctx[1].length + ")";
    			jsonnested.$set(jsonnested_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonnested.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonnested.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonnested, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let keys;
    	let previewKeys;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("JSONArrayNode", slots, []);

    	let { key } = $$props,
    		{ value } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props;

    	let { expanded = false } = $$props;
    	const filteredKey = new Set(["length"]);

    	function getValue(key) {
    		return value[key];
    	}

    	const writable_props = ["key", "value", "isParentExpanded", "isParentArray", "expanded"];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONArrayNode> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
    		if ("expanded" in $$props) $$invalidate(4, expanded = $$props.expanded);
    	};

    	$$self.$capture_state = () => ({
    		JSONNested,
    		key,
    		value,
    		isParentExpanded,
    		isParentArray,
    		expanded,
    		filteredKey,
    		getValue,
    		keys,
    		previewKeys
    	});

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
    		if ("expanded" in $$props) $$invalidate(4, expanded = $$props.expanded);
    		if ("keys" in $$props) $$invalidate(5, keys = $$props.keys);
    		if ("previewKeys" in $$props) $$invalidate(6, previewKeys = $$props.previewKeys);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 2) {
    			$$invalidate(5, keys = Object.getOwnPropertyNames(value));
    		}

    		if ($$self.$$.dirty & /*keys*/ 32) {
    			$$invalidate(6, previewKeys = keys.filter(key => !filteredKey.has(key)));
    		}
    	};

    	return [
    		key,
    		value,
    		isParentExpanded,
    		isParentArray,
    		expanded,
    		keys,
    		previewKeys,
    		getValue
    	];
    }

    class JSONArrayNode extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {
    			key: 0,
    			value: 1,
    			isParentExpanded: 2,
    			isParentArray: 3,
    			expanded: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONArrayNode",
    			options,
    			id: create_fragment$b.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*key*/ ctx[0] === undefined && !("key" in props)) {
    			console.warn("<JSONArrayNode> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[1] === undefined && !("value" in props)) {
    			console.warn("<JSONArrayNode> was created without expected prop 'value'");
    		}

    		if (/*isParentExpanded*/ ctx[2] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONArrayNode> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[3] === undefined && !("isParentArray" in props)) {
    			console.warn("<JSONArrayNode> was created without expected prop 'isParentArray'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<JSONArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<JSONArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get expanded() {
    		throw new Error("<JSONArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set expanded(value) {
    		throw new Error("<JSONArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-json-tree/src/JSONIterableArrayNode.svelte generated by Svelte v3.38.2 */

    function create_fragment$a(ctx) {
    	let jsonnested;
    	let current;

    	jsonnested = new JSONNested({
    			props: {
    				key: /*key*/ ctx[0],
    				isParentExpanded: /*isParentExpanded*/ ctx[1],
    				isParentArray: /*isParentArray*/ ctx[2],
    				keys: /*keys*/ ctx[4],
    				getKey: getKey$1,
    				getValue: getValue$1,
    				isArray: true,
    				label: "" + (/*nodeType*/ ctx[3] + "(" + /*keys*/ ctx[4].length + ")"),
    				bracketOpen: "{",
    				bracketClose: "}"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(jsonnested.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonnested, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const jsonnested_changes = {};
    			if (dirty & /*key*/ 1) jsonnested_changes.key = /*key*/ ctx[0];
    			if (dirty & /*isParentExpanded*/ 2) jsonnested_changes.isParentExpanded = /*isParentExpanded*/ ctx[1];
    			if (dirty & /*isParentArray*/ 4) jsonnested_changes.isParentArray = /*isParentArray*/ ctx[2];
    			if (dirty & /*keys*/ 16) jsonnested_changes.keys = /*keys*/ ctx[4];
    			if (dirty & /*nodeType, keys*/ 24) jsonnested_changes.label = "" + (/*nodeType*/ ctx[3] + "(" + /*keys*/ ctx[4].length + ")");
    			jsonnested.$set(jsonnested_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonnested.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonnested.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonnested, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getKey$1(key) {
    	return String(key[0]);
    }

    function getValue$1(key) {
    	return key[1];
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("JSONIterableArrayNode", slots, []);

    	let { key } = $$props,
    		{ value } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props,
    		{ nodeType } = $$props;

    	let keys = [];
    	const writable_props = ["key", "value", "isParentExpanded", "isParentArray", "nodeType"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONIterableArrayNode> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(5, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(2, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(3, nodeType = $$props.nodeType);
    	};

    	$$self.$capture_state = () => ({
    		JSONNested,
    		key,
    		value,
    		isParentExpanded,
    		isParentArray,
    		nodeType,
    		keys,
    		getKey: getKey$1,
    		getValue: getValue$1
    	});

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(5, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(2, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(3, nodeType = $$props.nodeType);
    		if ("keys" in $$props) $$invalidate(4, keys = $$props.keys);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 32) {
    			{
    				let result = [];
    				let i = 0;

    				for (const entry of value) {
    					result.push([i++, entry]);
    				}

    				$$invalidate(4, keys = result);
    			}
    		}
    	};

    	return [key, isParentExpanded, isParentArray, nodeType, keys, value];
    }

    class JSONIterableArrayNode extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {
    			key: 0,
    			value: 5,
    			isParentExpanded: 1,
    			isParentArray: 2,
    			nodeType: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONIterableArrayNode",
    			options,
    			id: create_fragment$a.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*key*/ ctx[0] === undefined && !("key" in props)) {
    			console.warn("<JSONIterableArrayNode> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[5] === undefined && !("value" in props)) {
    			console.warn("<JSONIterableArrayNode> was created without expected prop 'value'");
    		}

    		if (/*isParentExpanded*/ ctx[1] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONIterableArrayNode> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[2] === undefined && !("isParentArray" in props)) {
    			console.warn("<JSONIterableArrayNode> was created without expected prop 'isParentArray'");
    		}

    		if (/*nodeType*/ ctx[3] === undefined && !("nodeType" in props)) {
    			console.warn("<JSONIterableArrayNode> was created without expected prop 'nodeType'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get nodeType() {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nodeType(value) {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    class MapEntry {
      constructor(key, value) {
        this.key = key;
        this.value = value;
      }
    }

    /* node_modules/svelte-json-tree/src/JSONIterableMapNode.svelte generated by Svelte v3.38.2 */

    function create_fragment$9(ctx) {
    	let jsonnested;
    	let current;

    	jsonnested = new JSONNested({
    			props: {
    				key: /*key*/ ctx[0],
    				isParentExpanded: /*isParentExpanded*/ ctx[1],
    				isParentArray: /*isParentArray*/ ctx[2],
    				keys: /*keys*/ ctx[4],
    				getKey,
    				getValue,
    				label: "" + (/*nodeType*/ ctx[3] + "(" + /*keys*/ ctx[4].length + ")"),
    				colon: "",
    				bracketOpen: "{",
    				bracketClose: "}"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(jsonnested.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonnested, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const jsonnested_changes = {};
    			if (dirty & /*key*/ 1) jsonnested_changes.key = /*key*/ ctx[0];
    			if (dirty & /*isParentExpanded*/ 2) jsonnested_changes.isParentExpanded = /*isParentExpanded*/ ctx[1];
    			if (dirty & /*isParentArray*/ 4) jsonnested_changes.isParentArray = /*isParentArray*/ ctx[2];
    			if (dirty & /*keys*/ 16) jsonnested_changes.keys = /*keys*/ ctx[4];
    			if (dirty & /*nodeType, keys*/ 24) jsonnested_changes.label = "" + (/*nodeType*/ ctx[3] + "(" + /*keys*/ ctx[4].length + ")");
    			jsonnested.$set(jsonnested_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonnested.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonnested.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonnested, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getKey(entry) {
    	return entry[0];
    }

    function getValue(entry) {
    	return entry[1];
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("JSONIterableMapNode", slots, []);

    	let { key } = $$props,
    		{ value } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props,
    		{ nodeType } = $$props;

    	let keys = [];
    	const writable_props = ["key", "value", "isParentExpanded", "isParentArray", "nodeType"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONIterableMapNode> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(5, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(2, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(3, nodeType = $$props.nodeType);
    	};

    	$$self.$capture_state = () => ({
    		JSONNested,
    		MapEntry,
    		key,
    		value,
    		isParentExpanded,
    		isParentArray,
    		nodeType,
    		keys,
    		getKey,
    		getValue
    	});

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(5, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(2, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(3, nodeType = $$props.nodeType);
    		if ("keys" in $$props) $$invalidate(4, keys = $$props.keys);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 32) {
    			{
    				let result = [];
    				let i = 0;

    				for (const entry of value) {
    					result.push([i++, new MapEntry(entry[0], entry[1])]);
    				}

    				$$invalidate(4, keys = result);
    			}
    		}
    	};

    	return [key, isParentExpanded, isParentArray, nodeType, keys, value];
    }

    class JSONIterableMapNode extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {
    			key: 0,
    			value: 5,
    			isParentExpanded: 1,
    			isParentArray: 2,
    			nodeType: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONIterableMapNode",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*key*/ ctx[0] === undefined && !("key" in props)) {
    			console.warn("<JSONIterableMapNode> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[5] === undefined && !("value" in props)) {
    			console.warn("<JSONIterableMapNode> was created without expected prop 'value'");
    		}

    		if (/*isParentExpanded*/ ctx[1] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONIterableMapNode> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[2] === undefined && !("isParentArray" in props)) {
    			console.warn("<JSONIterableMapNode> was created without expected prop 'isParentArray'");
    		}

    		if (/*nodeType*/ ctx[3] === undefined && !("nodeType" in props)) {
    			console.warn("<JSONIterableMapNode> was created without expected prop 'nodeType'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONIterableMapNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONIterableMapNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<JSONIterableMapNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<JSONIterableMapNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONIterableMapNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONIterableMapNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONIterableMapNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONIterableMapNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get nodeType() {
    		throw new Error("<JSONIterableMapNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nodeType(value) {
    		throw new Error("<JSONIterableMapNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-json-tree/src/JSONMapEntryNode.svelte generated by Svelte v3.38.2 */

    function create_fragment$8(ctx) {
    	let jsonnested;
    	let current;

    	jsonnested = new JSONNested({
    			props: {
    				expanded: /*expanded*/ ctx[4],
    				isParentExpanded: /*isParentExpanded*/ ctx[2],
    				isParentArray: /*isParentArray*/ ctx[3],
    				key: /*isParentExpanded*/ ctx[2]
    				? String(/*key*/ ctx[0])
    				: /*value*/ ctx[1].key,
    				keys: /*keys*/ ctx[5],
    				getValue: /*getValue*/ ctx[6],
    				label: /*isParentExpanded*/ ctx[2] ? "Entry " : "=> ",
    				bracketOpen: "{",
    				bracketClose: "}"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(jsonnested.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonnested, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const jsonnested_changes = {};
    			if (dirty & /*expanded*/ 16) jsonnested_changes.expanded = /*expanded*/ ctx[4];
    			if (dirty & /*isParentExpanded*/ 4) jsonnested_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
    			if (dirty & /*isParentArray*/ 8) jsonnested_changes.isParentArray = /*isParentArray*/ ctx[3];

    			if (dirty & /*isParentExpanded, key, value*/ 7) jsonnested_changes.key = /*isParentExpanded*/ ctx[2]
    			? String(/*key*/ ctx[0])
    			: /*value*/ ctx[1].key;

    			if (dirty & /*isParentExpanded*/ 4) jsonnested_changes.label = /*isParentExpanded*/ ctx[2] ? "Entry " : "=> ";
    			jsonnested.$set(jsonnested_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonnested.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonnested.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonnested, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("JSONMapEntryNode", slots, []);

    	let { key } = $$props,
    		{ value } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props;

    	let { expanded = false } = $$props;
    	const keys = ["key", "value"];

    	function getValue(key) {
    		return value[key];
    	}

    	const writable_props = ["key", "value", "isParentExpanded", "isParentArray", "expanded"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONMapEntryNode> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
    		if ("expanded" in $$props) $$invalidate(4, expanded = $$props.expanded);
    	};

    	$$self.$capture_state = () => ({
    		JSONNested,
    		key,
    		value,
    		isParentExpanded,
    		isParentArray,
    		expanded,
    		keys,
    		getValue
    	});

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
    		if ("expanded" in $$props) $$invalidate(4, expanded = $$props.expanded);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [key, value, isParentExpanded, isParentArray, expanded, keys, getValue];
    }

    class JSONMapEntryNode extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
    			key: 0,
    			value: 1,
    			isParentExpanded: 2,
    			isParentArray: 3,
    			expanded: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONMapEntryNode",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*key*/ ctx[0] === undefined && !("key" in props)) {
    			console.warn("<JSONMapEntryNode> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[1] === undefined && !("value" in props)) {
    			console.warn("<JSONMapEntryNode> was created without expected prop 'value'");
    		}

    		if (/*isParentExpanded*/ ctx[2] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONMapEntryNode> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[3] === undefined && !("isParentArray" in props)) {
    			console.warn("<JSONMapEntryNode> was created without expected prop 'isParentArray'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONMapEntryNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONMapEntryNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<JSONMapEntryNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<JSONMapEntryNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONMapEntryNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONMapEntryNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONMapEntryNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONMapEntryNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get expanded() {
    		throw new Error("<JSONMapEntryNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set expanded(value) {
    		throw new Error("<JSONMapEntryNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-json-tree/src/JSONValueNode.svelte generated by Svelte v3.38.2 */
    const file$4 = "node_modules/svelte-json-tree/src/JSONValueNode.svelte";

    function create_fragment$7(ctx) {
    	let li;
    	let jsonkey;
    	let t0;
    	let span;

    	let t1_value = (/*valueGetter*/ ctx[2]
    	? /*valueGetter*/ ctx[2](/*value*/ ctx[1])
    	: /*value*/ ctx[1]) + "";

    	let t1;
    	let span_class_value;
    	let current;

    	jsonkey = new JSONKey({
    			props: {
    				key: /*key*/ ctx[0],
    				colon: /*colon*/ ctx[6],
    				isParentExpanded: /*isParentExpanded*/ ctx[3],
    				isParentArray: /*isParentArray*/ ctx[4]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			li = element("li");
    			create_component(jsonkey.$$.fragment);
    			t0 = space();
    			span = element("span");
    			t1 = text(t1_value);
    			attr_dev(span, "class", span_class_value = "" + (null_to_empty(/*nodeType*/ ctx[5]) + " svelte-1a1wsa3"));
    			add_location(span, file$4, 54, 2, 889);
    			attr_dev(li, "class", "svelte-1a1wsa3");
    			toggle_class(li, "indent", /*isParentExpanded*/ ctx[3]);
    			add_location(li, file$4, 52, 0, 787);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(jsonkey, li, null);
    			append_dev(li, t0);
    			append_dev(li, span);
    			append_dev(span, t1);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const jsonkey_changes = {};
    			if (dirty & /*key*/ 1) jsonkey_changes.key = /*key*/ ctx[0];
    			if (dirty & /*isParentExpanded*/ 8) jsonkey_changes.isParentExpanded = /*isParentExpanded*/ ctx[3];
    			if (dirty & /*isParentArray*/ 16) jsonkey_changes.isParentArray = /*isParentArray*/ ctx[4];
    			jsonkey.$set(jsonkey_changes);

    			if ((!current || dirty & /*valueGetter, value*/ 6) && t1_value !== (t1_value = (/*valueGetter*/ ctx[2]
    			? /*valueGetter*/ ctx[2](/*value*/ ctx[1])
    			: /*value*/ ctx[1]) + "")) set_data_dev(t1, t1_value);

    			if (!current || dirty & /*nodeType*/ 32 && span_class_value !== (span_class_value = "" + (null_to_empty(/*nodeType*/ ctx[5]) + " svelte-1a1wsa3"))) {
    				attr_dev(span, "class", span_class_value);
    			}

    			if (dirty & /*isParentExpanded*/ 8) {
    				toggle_class(li, "indent", /*isParentExpanded*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonkey.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonkey.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(jsonkey);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("JSONValueNode", slots, []);

    	let { key } = $$props,
    		{ value } = $$props,
    		{ valueGetter = null } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props,
    		{ nodeType } = $$props;

    	const { colon } = getContext(contextKey);
    	const writable_props = ["key", "value", "valueGetter", "isParentExpanded", "isParentArray", "nodeType"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONValueNode> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("valueGetter" in $$props) $$invalidate(2, valueGetter = $$props.valueGetter);
    		if ("isParentExpanded" in $$props) $$invalidate(3, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(4, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(5, nodeType = $$props.nodeType);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		contextKey,
    		JSONKey,
    		key,
    		value,
    		valueGetter,
    		isParentExpanded,
    		isParentArray,
    		nodeType,
    		colon
    	});

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("valueGetter" in $$props) $$invalidate(2, valueGetter = $$props.valueGetter);
    		if ("isParentExpanded" in $$props) $$invalidate(3, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(4, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(5, nodeType = $$props.nodeType);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [key, value, valueGetter, isParentExpanded, isParentArray, nodeType, colon];
    }

    class JSONValueNode extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			key: 0,
    			value: 1,
    			valueGetter: 2,
    			isParentExpanded: 3,
    			isParentArray: 4,
    			nodeType: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONValueNode",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*key*/ ctx[0] === undefined && !("key" in props)) {
    			console.warn("<JSONValueNode> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[1] === undefined && !("value" in props)) {
    			console.warn("<JSONValueNode> was created without expected prop 'value'");
    		}

    		if (/*isParentExpanded*/ ctx[3] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONValueNode> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[4] === undefined && !("isParentArray" in props)) {
    			console.warn("<JSONValueNode> was created without expected prop 'isParentArray'");
    		}

    		if (/*nodeType*/ ctx[5] === undefined && !("nodeType" in props)) {
    			console.warn("<JSONValueNode> was created without expected prop 'nodeType'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONValueNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONValueNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<JSONValueNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<JSONValueNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get valueGetter() {
    		throw new Error("<JSONValueNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valueGetter(value) {
    		throw new Error("<JSONValueNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONValueNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONValueNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONValueNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONValueNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get nodeType() {
    		throw new Error("<JSONValueNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nodeType(value) {
    		throw new Error("<JSONValueNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-json-tree/src/ErrorNode.svelte generated by Svelte v3.38.2 */
    const file$3 = "node_modules/svelte-json-tree/src/ErrorNode.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	child_ctx[10] = i;
    	return child_ctx;
    }

    // (40:2) {#if isParentExpanded}
    function create_if_block_2$1(ctx) {
    	let jsonarrow;
    	let current;

    	jsonarrow = new JSONArrow({
    			props: { expanded: /*expanded*/ ctx[0] },
    			$$inline: true
    		});

    	jsonarrow.$on("click", /*toggleExpand*/ ctx[7]);

    	const block = {
    		c: function create() {
    			create_component(jsonarrow.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonarrow, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const jsonarrow_changes = {};
    			if (dirty & /*expanded*/ 1) jsonarrow_changes.expanded = /*expanded*/ ctx[0];
    			jsonarrow.$set(jsonarrow_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonarrow.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonarrow.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonarrow, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(40:2) {#if isParentExpanded}",
    		ctx
    	});

    	return block;
    }

    // (45:2) {#if isParentExpanded}
    function create_if_block$2(ctx) {
    	let ul;
    	let current;
    	let if_block = /*expanded*/ ctx[0] && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			ul = element("ul");
    			if (if_block) if_block.c();
    			attr_dev(ul, "class", "svelte-ccvuoi");
    			toggle_class(ul, "collapse", !/*expanded*/ ctx[0]);
    			add_location(ul, file$3, 45, 4, 1108);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);
    			if (if_block) if_block.m(ul, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*expanded*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*expanded*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(ul, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*expanded*/ 1) {
    				toggle_class(ul, "collapse", !/*expanded*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(45:2) {#if isParentExpanded}",
    		ctx
    	});

    	return block;
    }

    // (47:6) {#if expanded}
    function create_if_block_1$1(ctx) {
    	let jsonnode;
    	let t0;
    	let li;
    	let jsonkey;
    	let t1;
    	let span;
    	let current;

    	jsonnode = new JSONNode({
    			props: {
    				key: "message",
    				value: /*value*/ ctx[2].message
    			},
    			$$inline: true
    		});

    	jsonkey = new JSONKey({
    			props: {
    				key: "stack",
    				colon: ":",
    				isParentExpanded: /*isParentExpanded*/ ctx[3]
    			},
    			$$inline: true
    		});

    	let each_value = /*stack*/ ctx[5];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			create_component(jsonnode.$$.fragment);
    			t0 = space();
    			li = element("li");
    			create_component(jsonkey.$$.fragment);
    			t1 = space();
    			span = element("span");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(span, file$3, 50, 10, 1304);
    			attr_dev(li, "class", "svelte-ccvuoi");
    			add_location(li, file$3, 48, 8, 1226);
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonnode, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, li, anchor);
    			mount_component(jsonkey, li, null);
    			append_dev(li, t1);
    			append_dev(li, span);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(span, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const jsonnode_changes = {};
    			if (dirty & /*value*/ 4) jsonnode_changes.value = /*value*/ ctx[2].message;
    			jsonnode.$set(jsonnode_changes);
    			const jsonkey_changes = {};
    			if (dirty & /*isParentExpanded*/ 8) jsonkey_changes.isParentExpanded = /*isParentExpanded*/ ctx[3];
    			jsonkey.$set(jsonkey_changes);

    			if (dirty & /*stack*/ 32) {
    				each_value = /*stack*/ ctx[5];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(span, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonnode.$$.fragment, local);
    			transition_in(jsonkey.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonnode.$$.fragment, local);
    			transition_out(jsonkey.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonnode, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(li);
    			destroy_component(jsonkey);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(47:6) {#if expanded}",
    		ctx
    	});

    	return block;
    }

    // (52:12) {#each stack as line, index}
    function create_each_block$1(ctx) {
    	let span;
    	let t_value = /*line*/ ctx[8] + "";
    	let t;
    	let br;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			br = element("br");
    			attr_dev(span, "class", "svelte-ccvuoi");
    			toggle_class(span, "indent", /*index*/ ctx[10] > 0);
    			add_location(span, file$3, 52, 14, 1366);
    			add_location(br, file$3, 52, 58, 1410);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*stack*/ 32 && t_value !== (t_value = /*line*/ ctx[8] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(52:12) {#each stack as line, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let li;
    	let t0;
    	let jsonkey;
    	let t1;
    	let span;
    	let t2;
    	let t3_value = (/*expanded*/ ctx[0] ? "" : /*value*/ ctx[2].message) + "";
    	let t3;
    	let t4;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*isParentExpanded*/ ctx[3] && create_if_block_2$1(ctx);

    	jsonkey = new JSONKey({
    			props: {
    				key: /*key*/ ctx[1],
    				colon: /*context*/ ctx[6].colon,
    				isParentExpanded: /*isParentExpanded*/ ctx[3],
    				isParentArray: /*isParentArray*/ ctx[4]
    			},
    			$$inline: true
    		});

    	let if_block1 = /*isParentExpanded*/ ctx[3] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			li = element("li");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			create_component(jsonkey.$$.fragment);
    			t1 = space();
    			span = element("span");
    			t2 = text("Error: ");
    			t3 = text(t3_value);
    			t4 = space();
    			if (if_block1) if_block1.c();
    			add_location(span, file$3, 43, 2, 1007);
    			attr_dev(li, "class", "svelte-ccvuoi");
    			toggle_class(li, "indent", /*isParentExpanded*/ ctx[3]);
    			add_location(li, file$3, 38, 0, 805);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			if (if_block0) if_block0.m(li, null);
    			append_dev(li, t0);
    			mount_component(jsonkey, li, null);
    			append_dev(li, t1);
    			append_dev(li, span);
    			append_dev(span, t2);
    			append_dev(span, t3);
    			append_dev(li, t4);
    			if (if_block1) if_block1.m(li, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(span, "click", /*toggleExpand*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*isParentExpanded*/ ctx[3]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*isParentExpanded*/ 8) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_2$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(li, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			const jsonkey_changes = {};
    			if (dirty & /*key*/ 2) jsonkey_changes.key = /*key*/ ctx[1];
    			if (dirty & /*isParentExpanded*/ 8) jsonkey_changes.isParentExpanded = /*isParentExpanded*/ ctx[3];
    			if (dirty & /*isParentArray*/ 16) jsonkey_changes.isParentArray = /*isParentArray*/ ctx[4];
    			jsonkey.$set(jsonkey_changes);
    			if ((!current || dirty & /*expanded, value*/ 5) && t3_value !== (t3_value = (/*expanded*/ ctx[0] ? "" : /*value*/ ctx[2].message) + "")) set_data_dev(t3, t3_value);

    			if (/*isParentExpanded*/ ctx[3]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*isParentExpanded*/ 8) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(li, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*isParentExpanded*/ 8) {
    				toggle_class(li, "indent", /*isParentExpanded*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(jsonkey.$$.fragment, local);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(jsonkey.$$.fragment, local);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			if (if_block0) if_block0.d();
    			destroy_component(jsonkey);
    			if (if_block1) if_block1.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let stack;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ErrorNode", slots, []);

    	let { key } = $$props,
    		{ value } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props;

    	let { expanded = false } = $$props;
    	const context = getContext(contextKey);
    	setContext(contextKey, { ...context, colon: ":" });

    	function toggleExpand() {
    		$$invalidate(0, expanded = !expanded);
    	}

    	const writable_props = ["key", "value", "isParentExpanded", "isParentArray", "expanded"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ErrorNode> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("key" in $$props) $$invalidate(1, key = $$props.key);
    		if ("value" in $$props) $$invalidate(2, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(3, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(4, isParentArray = $$props.isParentArray);
    		if ("expanded" in $$props) $$invalidate(0, expanded = $$props.expanded);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		setContext,
    		contextKey,
    		JSONArrow,
    		JSONNode,
    		JSONKey,
    		key,
    		value,
    		isParentExpanded,
    		isParentArray,
    		expanded,
    		context,
    		toggleExpand,
    		stack
    	});

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(1, key = $$props.key);
    		if ("value" in $$props) $$invalidate(2, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(3, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(4, isParentArray = $$props.isParentArray);
    		if ("expanded" in $$props) $$invalidate(0, expanded = $$props.expanded);
    		if ("stack" in $$props) $$invalidate(5, stack = $$props.stack);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 4) {
    			$$invalidate(5, stack = value.stack.split("\n"));
    		}

    		if ($$self.$$.dirty & /*isParentExpanded*/ 8) {
    			if (!isParentExpanded) {
    				$$invalidate(0, expanded = false);
    			}
    		}
    	};

    	return [
    		expanded,
    		key,
    		value,
    		isParentExpanded,
    		isParentArray,
    		stack,
    		context,
    		toggleExpand
    	];
    }

    class ErrorNode extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			key: 1,
    			value: 2,
    			isParentExpanded: 3,
    			isParentArray: 4,
    			expanded: 0
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ErrorNode",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*key*/ ctx[1] === undefined && !("key" in props)) {
    			console.warn("<ErrorNode> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[2] === undefined && !("value" in props)) {
    			console.warn("<ErrorNode> was created without expected prop 'value'");
    		}

    		if (/*isParentExpanded*/ ctx[3] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<ErrorNode> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[4] === undefined && !("isParentArray" in props)) {
    			console.warn("<ErrorNode> was created without expected prop 'isParentArray'");
    		}
    	}

    	get key() {
    		throw new Error("<ErrorNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<ErrorNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<ErrorNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<ErrorNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<ErrorNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<ErrorNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<ErrorNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<ErrorNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get expanded() {
    		throw new Error("<ErrorNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set expanded(value) {
    		throw new Error("<ErrorNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function objType(obj) {
      const type = Object.prototype.toString.call(obj).slice(8, -1);
      if (type === 'Object') {
        if (typeof obj[Symbol.iterator] === 'function') {
          return 'Iterable';
        }
        return obj.constructor.name;
      }

      return type;
    }

    /* node_modules/svelte-json-tree/src/JSONNode.svelte generated by Svelte v3.38.2 */

    function create_fragment$5(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*componentType*/ ctx[5];

    	function switch_props(ctx) {
    		return {
    			props: {
    				key: /*key*/ ctx[0],
    				value: /*value*/ ctx[1],
    				isParentExpanded: /*isParentExpanded*/ ctx[2],
    				isParentArray: /*isParentArray*/ ctx[3],
    				nodeType: /*nodeType*/ ctx[4],
    				valueGetter: /*valueGetter*/ ctx[6]
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const switch_instance_changes = {};
    			if (dirty & /*key*/ 1) switch_instance_changes.key = /*key*/ ctx[0];
    			if (dirty & /*value*/ 2) switch_instance_changes.value = /*value*/ ctx[1];
    			if (dirty & /*isParentExpanded*/ 4) switch_instance_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
    			if (dirty & /*isParentArray*/ 8) switch_instance_changes.isParentArray = /*isParentArray*/ ctx[3];
    			if (dirty & /*nodeType*/ 16) switch_instance_changes.nodeType = /*nodeType*/ ctx[4];
    			if (dirty & /*valueGetter*/ 64) switch_instance_changes.valueGetter = /*valueGetter*/ ctx[6];

    			if (switch_value !== (switch_value = /*componentType*/ ctx[5])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let nodeType;
    	let componentType;
    	let valueGetter;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("JSONNode", slots, []);

    	let { key } = $$props,
    		{ value } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props;

    	function getComponent(nodeType) {
    		switch (nodeType) {
    			case "Object":
    				return JSONObjectNode;
    			case "Error":
    				return ErrorNode;
    			case "Array":
    				return JSONArrayNode;
    			case "Iterable":
    			case "Map":
    			case "Set":
    				return typeof value.set === "function"
    				? JSONIterableMapNode
    				: JSONIterableArrayNode;
    			case "MapEntry":
    				return JSONMapEntryNode;
    			default:
    				return JSONValueNode;
    		}
    	}

    	function getValueGetter(nodeType) {
    		switch (nodeType) {
    			case "Object":
    			case "Error":
    			case "Array":
    			case "Iterable":
    			case "Map":
    			case "Set":
    			case "MapEntry":
    			case "Number":
    				return undefined;
    			case "String":
    				return raw => `"${raw}"`;
    			case "Boolean":
    				return raw => raw ? "true" : "false";
    			case "Date":
    				return raw => raw.toISOString();
    			case "Null":
    				return () => "null";
    			case "Undefined":
    				return () => "undefined";
    			case "Function":
    			case "Symbol":
    				return raw => raw.toString();
    			default:
    				return () => `<${nodeType}>`;
    		}
    	}

    	const writable_props = ["key", "value", "isParentExpanded", "isParentArray"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONNode> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
    	};

    	$$self.$capture_state = () => ({
    		JSONObjectNode,
    		JSONArrayNode,
    		JSONIterableArrayNode,
    		JSONIterableMapNode,
    		JSONMapEntryNode,
    		JSONValueNode,
    		ErrorNode,
    		objType,
    		key,
    		value,
    		isParentExpanded,
    		isParentArray,
    		getComponent,
    		getValueGetter,
    		nodeType,
    		componentType,
    		valueGetter
    	});

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(4, nodeType = $$props.nodeType);
    		if ("componentType" in $$props) $$invalidate(5, componentType = $$props.componentType);
    		if ("valueGetter" in $$props) $$invalidate(6, valueGetter = $$props.valueGetter);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 2) {
    			$$invalidate(4, nodeType = objType(value));
    		}

    		if ($$self.$$.dirty & /*nodeType*/ 16) {
    			$$invalidate(5, componentType = getComponent(nodeType));
    		}

    		if ($$self.$$.dirty & /*nodeType*/ 16) {
    			$$invalidate(6, valueGetter = getValueGetter(nodeType));
    		}
    	};

    	return [
    		key,
    		value,
    		isParentExpanded,
    		isParentArray,
    		nodeType,
    		componentType,
    		valueGetter
    	];
    }

    class JSONNode extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
    			key: 0,
    			value: 1,
    			isParentExpanded: 2,
    			isParentArray: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONNode",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*key*/ ctx[0] === undefined && !("key" in props)) {
    			console.warn("<JSONNode> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[1] === undefined && !("value" in props)) {
    			console.warn("<JSONNode> was created without expected prop 'value'");
    		}

    		if (/*isParentExpanded*/ ctx[2] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONNode> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[3] === undefined && !("isParentArray" in props)) {
    			console.warn("<JSONNode> was created without expected prop 'isParentArray'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<JSONNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<JSONNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-json-tree/src/Root.svelte generated by Svelte v3.38.2 */
    const file$2 = "node_modules/svelte-json-tree/src/Root.svelte";

    function create_fragment$4(ctx) {
    	let ul;
    	let jsonnode;
    	let current;

    	jsonnode = new JSONNode({
    			props: {
    				key: /*key*/ ctx[0],
    				value: /*value*/ ctx[1],
    				isParentExpanded: true,
    				isParentArray: false
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			ul = element("ul");
    			create_component(jsonnode.$$.fragment);
    			attr_dev(ul, "class", "svelte-hu2jd8");
    			add_location(ul, file$2, 37, 0, 1243);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);
    			mount_component(jsonnode, ul, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const jsonnode_changes = {};
    			if (dirty & /*key*/ 1) jsonnode_changes.key = /*key*/ ctx[0];
    			if (dirty & /*value*/ 2) jsonnode_changes.value = /*value*/ ctx[1];
    			jsonnode.$set(jsonnode_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonnode.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonnode.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_component(jsonnode);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Root", slots, []);
    	setContext(contextKey, {});
    	let { key = "" } = $$props, { value } = $$props;
    	const writable_props = ["key", "value"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Root> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    	};

    	$$self.$capture_state = () => ({
    		JSONNode,
    		setContext,
    		contextKey,
    		key,
    		value
    	});

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [key, value];
    }

    class Root extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { key: 0, value: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Root",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*value*/ ctx[1] === undefined && !("value" in props)) {
    			console.warn("<Root> was created without expected prop 'value'");
    		}
    	}

    	get key() {
    		throw new Error("<Root>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<Root>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Root>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Root>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/ModeSwitcher.svelte generated by Svelte v3.38.2 */
    const file$1 = "src/components/ModeSwitcher.svelte";

    // (30:2) {:else}
    function create_else_block$1(ctx) {
    	let svg;
    	let title;
    	let t;
    	let g;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			title = svg_element("title");
    			t = text("Object view");
    			g = svg_element("g");
    			path = svg_element("path");
    			add_location(title, file$1, 41, 6, 2254);
    			attr_dev(path, "fill", "white");
    			attr_dev(path, "d", "M0,69.1V53.79c4.65-0.04,8.13-1.42,10.49-4.12C12.82,46.96,14,40.87,14,31.41c0-7.22,0.26-12.56,0.81-16.03 c0.52-3.47,1.81-6.39,3.86-8.73c2.05-2.35,4.69-4.03,7.92-5.08C29.81,0.52,34.4,0,40.33,0h3.38v15.31c-6.2,0-9.9,0.63-11.12,1.92 c-1.22,1.27-1.88,3.77-1.96,7.48c-0.26,10.21-0.59,16.86-0.98,19.93c-0.41,3.05-1.35,5.98-2.81,8.77 c-1.46,2.79-4.19,5.47-8.18,8.03c3.8,2.31,6.54,5.06,8.24,8.24c1.72,3.21,2.75,7.81,3.03,13.83l0.96,18.63 c0.39,1.79,1.31,3.14,2.77,4.06c1.46,0.92,4.82,1.37,10.06,1.37v15.31h-3.34c-6.83,0-12.08-0.78-15.81-2.33 c-3.71-1.55-6.39-4.1-8.07-7.63c-1.66-3.55-2.49-9.27-2.49-17.14c0-8.7-0.31-14.26-0.89-16.71c-0.59-2.42-1.74-4.65-3.45-6.67 C7.94,70.36,4.73,69.27,0,69.1L0,69.1z M115.16,69.1c-4.65,0.04-8.14,1.42-10.49,4.17c-2.33,2.73-3.51,8.77-3.51,18.15 c0,7.26-0.26,12.61-0.76,16.1c-0.52,3.47-1.79,6.39-3.84,8.72c-2.05,2.36-4.71,4.03-7.94,5.08c-3.25,1.05-7.83,1.57-13.76,1.57 h-3.4v-15.31c5.95,0,9.6-0.61,10.93-1.85c1.35-1.24,2.07-3.75,2.16-7.55c0.26-10.93,0.65-17.93,1.18-21.03 c0.55-3.1,1.59-5.98,3.21-8.66c1.59-2.7,4.12-5.04,7.57-7.05c-3.64-2.38-6.19-4.73-7.63-7.02c-1.44-2.31-2.42-4.8-2.92-7.5 c-0.5-2.7-0.89-7.74-1.16-15.09c-0.24-7.35-0.55-11.56-0.9-12.61c-0.33-1.07-1.16-1.98-2.46-2.75c-1.31-0.76-4.62-1.16-9.97-1.16V0 h3.38c6.83,0,12.08,0.79,15.79,2.33c3.71,1.55,6.39,4.1,8.05,7.63c1.66,3.56,2.49,9.27,2.49,17.14c0,9.05,0.33,14.74,0.98,17.08 c0.68,2.36,1.83,4.49,3.53,6.43c1.68,1.94,4.84,2.99,9.49,3.16V69.1L115.16,69.1z");
    			add_location(path, file$1, 43, 9, 2299);
    			add_location(g, file$1, 42, 6, 2287);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "id", "Layer_1");
    			attr_dev(svg, "x", "0px");
    			attr_dev(svg, "y", "0px");
    			attr_dev(svg, "viewBox", "0 0 115.16 122.88");
    			set_style(svg, "enable-background", "new 0 0 115.16 122.88");
    			attr_dev(svg, "xml:space", "preserve");
    			add_location(svg, file$1, 30, 4, 1965);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, title);
    			append_dev(title, t);
    			append_dev(svg, g);
    			append_dev(g, path);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(30:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (9:2) {#if $objectView}
    function create_if_block$1(ctx) {
    	let svg;
    	let style;
    	let title;
    	let t;
    	let g;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			style = svg_element("style");
    			title = svg_element("title");
    			t = text("Object view");
    			g = svg_element("g");
    			path = svg_element("path");
    			attr_dev(style, "type", "text/css");
    			add_location(style, file$1, 19, 7, 530);
    			add_location(title, file$1, 20, 6, 568);
    			attr_dev(path, "fill", "white");
    			attr_dev(path, "class", "st0");
    			attr_dev(path, "d", "M6.77,12.82h16.25v10.5h-7.01c-3.13,0-5.72,2.59-5.72,5.72v78.43c0,3.13,2.58,5.72,5.72,5.72h69.8 c3.14,0,5.72-2.58,5.72-5.72V29.04c0-3.14-2.59-5.72-5.72-5.72h-7.01v-10.5h16.25c3.73,0,6.77,3.07,6.77,6.77v96.51 c0,3.71-3.06,6.77-6.77,6.77H6.77c-3.71,0-6.77-3.05-6.77-6.77V19.59C0,15.86,3.05,12.82,6.77,12.82L6.77,12.82z M37.79,95.89 c-2.01,0-3.64-1.63-3.64-3.64c0-2.01,1.63-3.64,3.64-3.64h26.24c2.01,0,3.64,1.63,3.64,3.64c0,2.01-1.63,3.64-3.64,3.64H37.79 L37.79,95.89z M30.03,73.91c-2.01,0-3.64-1.63-3.64-3.64c0-2.01,1.63-3.64,3.64-3.64h41.76c2.01,0,3.64,1.63,3.64,3.64 c0,2.01-1.63,3.64-3.64,3.64H30.03L30.03,73.91z M23.2,51.94c-2.01,0-3.64-1.63-3.64-3.64s1.63-3.64,3.64-3.64h55.44 c2.01,0,3.64,1.63,3.64,3.64s-1.63,3.64-3.64,3.64H23.2L23.2,51.94z M32.4,9.46h7.68C40.73,4.13,45.04,0,50.26,0 c5.19,0,9.47,4.07,10.17,9.35l8.99,0.11c0.63,0,1.13,0.5,1.13,1.13v15.33c0,0.63-0.5,1.13-1.13,1.13h-37 c-0.61,0-1.13-0.5-1.13-1.13V10.59C31.27,9.97,31.78,9.46,32.4,9.46L32.4,9.46L32.4,9.46L32.4,9.46z M46.06,14.1 c0.69,0.95,1.69,1.89,2.74,2.37c0.86,0.26,1.8,0.28,2.67,0.04c1.36-0.63,2.62-2.14,3.2-3.4c0.07-0.36,0.11-0.73,0.11-1.13 c0-2.67-2.05-4.84-4.57-4.84c-2.53,0-4.57,2.17-4.57,4.84C45.64,12.8,45.79,13.51,46.06,14.1L46.06,14.1L46.06,14.1L46.06,14.1z");
    			add_location(path, file$1, 22, 9, 613);
    			add_location(g, file$1, 21, 6, 601);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "id", "Layer_1");
    			attr_dev(svg, "x", "0px");
    			attr_dev(svg, "y", "0px");
    			attr_dev(svg, "viewBox", "0 0 101.83 122.88");
    			set_style(svg, "enable-background", "new 0 0 101.83 122.88");
    			attr_dev(svg, "xml:space", "preserve");
    			add_location(svg, file$1, 9, 4, 246);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, style);
    			append_dev(svg, title);
    			append_dev(title, t);
    			append_dev(svg, g);
    			append_dev(g, path);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(9:2) {#if $objectView}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*$objectView*/ ctx[0]) return create_if_block$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "w-5 h-7 cursor-pointer");
    			add_location(div, file$1, 7, 0, 163);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*toggleMode*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $objectView;
    	validate_store(objectView, "objectView");
    	component_subscribe($$self, objectView, $$value => $$invalidate(0, $objectView = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ModeSwitcher", slots, []);

    	function toggleMode() {
    		objectView.set(!$objectView);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ModeSwitcher> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		objectView,
    		onMount,
    		toggleMode,
    		$objectView
    	});

    	return [$objectView, toggleMode];
    }

    class ModeSwitcher extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModeSwitcher",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/Home.svelte generated by Svelte v3.38.2 */

    const { Object: Object_1 } = globals;
    const file = "src/Home.svelte";

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i];
    	return child_ctx;
    }

    function get_each_context_6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[27] = list[i];
    	return child_ctx;
    }

    function get_each_context_7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	return child_ctx;
    }

    function get_each_context_8(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i];
    	return child_ctx;
    }

    function get_each_context_9(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[27] = list[i];
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    // (78:8) {#if $output}
    function create_if_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_if_block_2, create_if_block_8, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$objectView*/ ctx[3]) return 0;
    		if (/*selectedView*/ ctx[1] === "content") return 1;
    		if (/*selectedView*/ ctx[1] === "rdf") return 2;
    		return 3;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(78:8) {#if $output}",
    		ctx
    	});

    	return block;
    }

    // (202:10) {:else}
    function create_else_block_1(ctx) {
    	let h30;
    	let t1;
    	let div0;
    	let t2_value = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].docNquads + "";
    	let t2;
    	let t3;
    	let h31;
    	let t5;
    	let div1;
    	let t6_value = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofNquads + "";
    	let t6;

    	const block = {
    		c: function create() {
    			h30 = element("h3");
    			h30.textContent = "Document";
    			t1 = space();
    			div0 = element("div");
    			t2 = text(t2_value);
    			t3 = space();
    			h31 = element("h3");
    			h31.textContent = "Proof Options";
    			t5 = space();
    			div1 = element("div");
    			t6 = text(t6_value);
    			attr_dev(h30, "class", "text-left italic");
    			add_location(h30, file, 202, 12, 8367);
    			attr_dev(div0, "class", "border border-white overflow-auto");
    			add_location(div0, file, 203, 12, 8422);
    			attr_dev(h31, "class", "text-left italic mt-2");
    			add_location(h31, file, 206, 12, 8549);
    			attr_dev(div1, "class", "border border-white overflow-auto");
    			add_location(div1, file, 207, 12, 8614);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h30, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, h31, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$output, selectedView*/ 6 && t2_value !== (t2_value = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].docNquads + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*$output, selectedView*/ 6 && t6_value !== (t6_value = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofNquads + "")) set_data_dev(t6, t6_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h30);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(h31);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(202:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (167:43) 
    function create_if_block_8(ctx) {
    	let h30;
    	let t1;
    	let table0;
    	let thead0;
    	let t2;
    	let tbody0;
    	let t3;
    	let h31;
    	let t5;
    	let table1;
    	let thead1;
    	let t6;
    	let tbody1;
    	let each_value_9 = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].document.headers;
    	validate_each_argument(each_value_9);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_9.length; i += 1) {
    		each_blocks_3[i] = create_each_block_9(get_each_context_9(ctx, each_value_9, i));
    	}

    	let each_value_7 = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].document.body;
    	validate_each_argument(each_value_7);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_7.length; i += 1) {
    		each_blocks_2[i] = create_each_block_7(get_each_context_7(ctx, each_value_7, i));
    	}

    	let each_value_6 = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions.headers;
    	validate_each_argument(each_value_6);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_6.length; i += 1) {
    		each_blocks_1[i] = create_each_block_6(get_each_context_6(ctx, each_value_6, i));
    	}

    	let each_value_4 = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions.body;
    	validate_each_argument(each_value_4);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	const block = {
    		c: function create() {
    			h30 = element("h3");
    			h30.textContent = "Document";
    			t1 = space();
    			table0 = element("table");
    			thead0 = element("thead");

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t2 = space();
    			tbody0 = element("tbody");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t3 = space();
    			h31 = element("h3");
    			h31.textContent = "Proof Options";
    			t5 = space();
    			table1 = element("table");
    			thead1 = element("thead");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t6 = space();
    			tbody1 = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h30, "class", "text-left italic");
    			add_location(h30, file, 167, 12, 6949);
    			attr_dev(thead0, "class", "border-b-4 border-white");
    			add_location(thead0, file, 169, 14, 7026);
    			attr_dev(tbody0, "class", "whitespace-nowrap");
    			add_location(tbody0, file, 174, 14, 7258);
    			add_location(table0, file, 168, 12, 7004);
    			attr_dev(h31, "class", "text-left italic mt-2");
    			add_location(h31, file, 184, 12, 7640);
    			attr_dev(thead1, "class", "border-b-4 border-white");
    			add_location(thead1, file, 186, 14, 7727);
    			attr_dev(tbody1, "class", "whitespace-nowrap");
    			add_location(tbody1, file, 191, 14, 7963);
    			add_location(table1, file, 185, 12, 7705);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h30, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, table0, anchor);
    			append_dev(table0, thead0);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].m(thead0, null);
    			}

    			append_dev(table0, t2);
    			append_dev(table0, tbody0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(tbody0, null);
    			}

    			insert_dev(target, t3, anchor);
    			insert_dev(target, h31, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, table1, anchor);
    			append_dev(table1, thead1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(thead1, null);
    			}

    			append_dev(table1, t6);
    			append_dev(table1, tbody1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody1, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$output, selectedView*/ 6) {
    				each_value_9 = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].document.headers;
    				validate_each_argument(each_value_9);
    				let i;

    				for (i = 0; i < each_value_9.length; i += 1) {
    					const child_ctx = get_each_context_9(ctx, each_value_9, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_3[i] = create_each_block_9(child_ctx);
    						each_blocks_3[i].c();
    						each_blocks_3[i].m(thead0, null);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_9.length;
    			}

    			if (dirty[0] & /*$output, selectedView*/ 6) {
    				each_value_7 = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].document.body;
    				validate_each_argument(each_value_7);
    				let i;

    				for (i = 0; i < each_value_7.length; i += 1) {
    					const child_ctx = get_each_context_7(ctx, each_value_7, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_7(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(tbody0, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_7.length;
    			}

    			if (dirty[0] & /*$output, selectedView*/ 6) {
    				each_value_6 = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions.headers;
    				validate_each_argument(each_value_6);
    				let i;

    				for (i = 0; i < each_value_6.length; i += 1) {
    					const child_ctx = get_each_context_6(ctx, each_value_6, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_6(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(thead1, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_6.length;
    			}

    			if (dirty[0] & /*$output, selectedView*/ 6) {
    				each_value_4 = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions.body;
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_4.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h30);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(table0);
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(h31);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(table1);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(167:43) ",
    		ctx
    	});

    	return block;
    }

    // (81:47) 
    function create_if_block_2(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*$output*/ ctx[2][/*selectedView*/ ctx[1]].verifiableCredential) return create_if_block_3;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(81:47) ",
    		ctx
    	});

    	return block;
    }

    // (79:10) {#if $objectView}
    function create_if_block_1(ctx) {
    	let jsontree;
    	let updating_value;
    	let current;

    	function jsontree_value_binding(value) {
    		/*jsontree_value_binding*/ ctx[10](value);
    	}

    	let jsontree_props = {};

    	if (/*$output*/ ctx[2][/*selectedView*/ ctx[1]] !== void 0) {
    		jsontree_props.value = /*$output*/ ctx[2][/*selectedView*/ ctx[1]];
    	}

    	jsontree = new Root({ props: jsontree_props, $$inline: true });
    	binding_callbacks.push(() => bind(jsontree, "value", jsontree_value_binding));

    	const block = {
    		c: function create() {
    			create_component(jsontree.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsontree, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const jsontree_changes = {};

    			if (!updating_value && dirty[0] & /*$output, selectedView*/ 6) {
    				updating_value = true;
    				jsontree_changes.value = /*$output*/ ctx[2][/*selectedView*/ ctx[1]];
    				add_flush_callback(() => updating_value = false);
    			}

    			jsontree.$set(jsontree_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsontree.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsontree.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsontree, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(79:10) {#if $objectView}",
    		ctx
    	});

    	return block;
    }

    // (171:16) {#each $output[selectedView].document.headers as header}
    function create_each_block_9(ctx) {
    	let th;
    	let t_value = /*header*/ ctx[27] + "";
    	let t;

    	const block = {
    		c: function create() {
    			th = element("th");
    			t = text(t_value);
    			attr_dev(th, "class", "text-left p-2");
    			add_location(th, file, 171, 18, 7157);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, th, anchor);
    			append_dev(th, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$output, selectedView*/ 6 && t_value !== (t_value = /*header*/ ctx[27] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(th);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_9.name,
    		type: "each",
    		source: "(171:16) {#each $output[selectedView].document.headers as header}",
    		ctx
    	});

    	return block;
    }

    // (178:20) {#each row as column}
    function create_each_block_8(ctx) {
    	let td;
    	let t_value = /*column*/ ctx[24] + "";
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			t = text(t_value);
    			attr_dev(td, "class", "p-2");
    			add_location(td, file, 178, 22, 7478);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$output, selectedView*/ 6 && t_value !== (t_value = /*column*/ ctx[24] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_8.name,
    		type: "each",
    		source: "(178:20) {#each row as column}",
    		ctx
    	});

    	return block;
    }

    // (176:16) {#each $output[selectedView].document.body as row}
    function create_each_block_7(ctx) {
    	let tr;
    	let t;
    	let each_value_8 = /*row*/ ctx[21];
    	validate_each_argument(each_value_8);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_8.length; i += 1) {
    		each_blocks[i] = create_each_block_8(get_each_context_8(ctx, each_value_8, i));
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr_dev(tr, "class", "border-b-2 border-white");
    			add_location(tr, file, 176, 18, 7377);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tr, null);
    			}

    			append_dev(tr, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$output, selectedView*/ 6) {
    				each_value_8 = /*row*/ ctx[21];
    				validate_each_argument(each_value_8);
    				let i;

    				for (i = 0; i < each_value_8.length; i += 1) {
    					const child_ctx = get_each_context_8(ctx, each_value_8, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_8(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tr, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_8.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_7.name,
    		type: "each",
    		source: "(176:16) {#each $output[selectedView].document.body as row}",
    		ctx
    	});

    	return block;
    }

    // (188:16) {#each $output[selectedView].proofOptions.headers as header}
    function create_each_block_6(ctx) {
    	let th;
    	let t_value = /*header*/ ctx[27] + "";
    	let t;

    	const block = {
    		c: function create() {
    			th = element("th");
    			t = text(t_value);
    			attr_dev(th, "class", "text-left p-2");
    			add_location(th, file, 188, 18, 7862);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, th, anchor);
    			append_dev(th, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$output, selectedView*/ 6 && t_value !== (t_value = /*header*/ ctx[27] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(th);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_6.name,
    		type: "each",
    		source: "(188:16) {#each $output[selectedView].proofOptions.headers as header}",
    		ctx
    	});

    	return block;
    }

    // (195:20) {#each row as column}
    function create_each_block_5(ctx) {
    	let td;
    	let t_value = /*column*/ ctx[24] + "";
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			t = text(t_value);
    			attr_dev(td, "class", "p-2");
    			add_location(td, file, 195, 22, 8187);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$output, selectedView*/ 6 && t_value !== (t_value = /*column*/ ctx[24] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(195:20) {#each row as column}",
    		ctx
    	});

    	return block;
    }

    // (193:16) {#each $output[selectedView].proofOptions.body as row}
    function create_each_block_4(ctx) {
    	let tr;
    	let t;
    	let each_value_5 = /*row*/ ctx[21];
    	validate_each_argument(each_value_5);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr_dev(tr, "class", "border-b-2 border-white");
    			add_location(tr, file, 193, 18, 8086);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tr, null);
    			}

    			append_dev(tr, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$output, selectedView*/ 6) {
    				each_value_5 = /*row*/ ctx[21];
    				validate_each_argument(each_value_5);
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_5(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tr, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_5.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(193:16) {#each $output[selectedView].proofOptions.body as row}",
    		ctx
    	});

    	return block;
    }

    // (164:12) {:else}
    function create_else_block(ctx) {
    	let h2;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Document";
    			add_location(h2, file, 164, 14, 6857);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(164:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (82:12) {#if $output[selectedView].verifiableCredential}
    function create_if_block_3(ctx) {
    	let h20;
    	let t1;
    	let t2;
    	let h21;
    	let t4;
    	let each1_anchor;
    	let each_value_2 = Object.keys(/*$output*/ ctx[2][/*selectedView*/ ctx[1]].verifiableCredential);
    	validate_each_argument(each_value_2);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value = Object.keys(/*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			h20 = element("h2");
    			h20.textContent = "Verifiable Credential";
    			t1 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t2 = space();
    			h21 = element("h2");
    			h21.textContent = "Proof Options";
    			t4 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each1_anchor = empty();
    			add_location(h20, file, 82, 14, 2957);
    			attr_dev(h21, "class", "mt-8");
    			add_location(h21, file, 123, 14, 4910);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(target, anchor);
    			}

    			insert_dev(target, t2, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t4, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$output, selectedView, decamelize*/ 22) {
    				each_value_2 = Object.keys(/*$output*/ ctx[2][/*selectedView*/ ctx[1]].verifiableCredential);
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_2(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(t2.parentNode, t2);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_2.length;
    			}

    			if (dirty[0] & /*$output, selectedView, decamelize*/ 22) {
    				each_value = Object.keys(/*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each1_anchor.parentNode, each1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h20);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(h21);
    			if (detaching) detach_dev(t4);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(82:12) {#if $output[selectedView].verifiableCredential}",
    		ctx
    	});

    	return block;
    }

    // (89:18) {#if typeof $output[selectedView].verifiableCredential[field] === "string"}
    function create_if_block_7(ctx) {
    	let p;
    	let t_value = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].verifiableCredential[/*field*/ ctx[11]] + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			add_location(p, file, 89, 20, 3354);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$output, selectedView*/ 6 && t_value !== (t_value = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].verifiableCredential[/*field*/ ctx[11]] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(89:18) {#if typeof $output[selectedView].verifiableCredential[field] === \\\"string\\\"}",
    		ctx
    	});

    	return block;
    }

    // (95:16) {#if typeof $output[selectedView].verifiableCredential[field] !== "string"}
    function create_if_block_6(ctx) {
    	let div;
    	let each_value_3 = Object.keys(/*$output*/ ctx[2][/*selectedView*/ ctx[1]].verifiableCredential[/*field*/ ctx[11]]);
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "flex-col flex");
    			add_location(div, file, 95, 18, 3614);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*decamelize, $output, selectedView*/ 22) {
    				each_value_3 = Object.keys(/*$output*/ ctx[2][/*selectedView*/ ctx[1]].verifiableCredential[/*field*/ ctx[11]]);
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(95:16) {#if typeof $output[selectedView].verifiableCredential[field] !== \\\"string\\\"}",
    		ctx
    	});

    	return block;
    }

    // (97:20) {#each Object.keys($output[selectedView].verifiableCredential[field]) as subField}
    function create_each_block_3(ctx) {
    	let div;
    	let p0;

    	let t0_value = (/*decamelize*/ ctx[4](/*subField*/ ctx[14], " ")
    	? `${/*decamelize*/ ctx[4](/*subField*/ ctx[14], " ")}:`
    	: "") + "";

    	let t0;
    	let t1;
    	let p1;
    	let t2_value = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].verifiableCredential[/*field*/ ctx[11]][/*subField*/ ctx[14]] + "";
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p0 = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			p1 = element("p");
    			t2 = text(t2_value);
    			attr_dev(p0, "class", "font-bold mr-2");
    			add_location(p0, file, 108, 24, 4319);
    			toggle_class(p1, "font-bold", !/*decamelize*/ ctx[4](/*subField*/ ctx[14], " "));
    			add_location(p1, file, 113, 24, 4548);
    			attr_dev(div, "class", "flex pl-2 ml-2 border-l-4 border-white");
    			toggle_class(div, "justify-center", !/*decamelize*/ ctx[4](/*subField*/ ctx[14], " "));
    			toggle_class(div, "border-b-4", Object.keys(/*$output*/ ctx[2][/*selectedView*/ ctx[1]].verifiableCredential[/*field*/ ctx[11]])[Object.keys(/*$output*/ ctx[2][/*selectedView*/ ctx[1]].verifiableCredential[/*field*/ ctx[11]]).length - 1] === /*subField*/ ctx[14]);
    			add_location(div, file, 97, 22, 3767);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p0);
    			append_dev(p0, t0);
    			append_dev(div, t1);
    			append_dev(div, p1);
    			append_dev(p1, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$output, selectedView*/ 6 && t0_value !== (t0_value = (/*decamelize*/ ctx[4](/*subField*/ ctx[14], " ")
    			? `${/*decamelize*/ ctx[4](/*subField*/ ctx[14], " ")}:`
    			: "") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$output, selectedView*/ 6 && t2_value !== (t2_value = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].verifiableCredential[/*field*/ ctx[11]][/*subField*/ ctx[14]] + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*decamelize, $output, selectedView*/ 22) {
    				toggle_class(p1, "font-bold", !/*decamelize*/ ctx[4](/*subField*/ ctx[14], " "));
    			}

    			if (dirty[0] & /*decamelize, $output, selectedView*/ 22) {
    				toggle_class(div, "justify-center", !/*decamelize*/ ctx[4](/*subField*/ ctx[14], " "));
    			}

    			if (dirty[0] & /*$output, selectedView*/ 6) {
    				toggle_class(div, "border-b-4", Object.keys(/*$output*/ ctx[2][/*selectedView*/ ctx[1]].verifiableCredential[/*field*/ ctx[11]])[Object.keys(/*$output*/ ctx[2][/*selectedView*/ ctx[1]].verifiableCredential[/*field*/ ctx[11]]).length - 1] === /*subField*/ ctx[14]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(97:20) {#each Object.keys($output[selectedView].verifiableCredential[field]) as subField}",
    		ctx
    	});

    	return block;
    }

    // (84:14) {#each Object.keys($output[selectedView].verifiableCredential) as field}
    function create_each_block_2(ctx) {
    	let div;
    	let p;
    	let t0_value = /*decamelize*/ ctx[4](/*field*/ ctx[11], " ") + "";
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let if_block1_anchor;
    	let if_block0 = typeof /*$output*/ ctx[2][/*selectedView*/ ctx[1]].verifiableCredential[/*field*/ ctx[11]] === "string" && create_if_block_7(ctx);
    	let if_block1 = typeof /*$output*/ ctx[2][/*selectedView*/ ctx[1]].verifiableCredential[/*field*/ ctx[11]] !== "string" && create_if_block_6(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = text(": ");
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr_dev(p, "class", "capitalize font-bold");
    			add_location(p, file, 85, 18, 3132);
    			attr_dev(div, "class", "flex m-2");
    			add_location(div, file, 84, 16, 3091);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(div, t2);
    			if (if_block0) if_block0.m(div, null);
    			insert_dev(target, t3, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$output, selectedView*/ 6 && t0_value !== (t0_value = /*decamelize*/ ctx[4](/*field*/ ctx[11], " ") + "")) set_data_dev(t0, t0_value);

    			if (typeof /*$output*/ ctx[2][/*selectedView*/ ctx[1]].verifiableCredential[/*field*/ ctx[11]] === "string") {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_7(ctx);
    					if_block0.c();
    					if_block0.m(div, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (typeof /*$output*/ ctx[2][/*selectedView*/ ctx[1]].verifiableCredential[/*field*/ ctx[11]] !== "string") {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_6(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (detaching) detach_dev(t3);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(84:14) {#each Object.keys($output[selectedView].verifiableCredential) as field}",
    		ctx
    	});

    	return block;
    }

    // (131:18) {#if typeof $output[selectedView].proofOptions[field] === "string"}
    function create_if_block_5(ctx) {
    	let p;
    	let t_value = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions[/*field*/ ctx[11]] + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			add_location(p, file, 131, 20, 5359);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$output, selectedView*/ 6 && t_value !== (t_value = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions[/*field*/ ctx[11]] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(131:18) {#if typeof $output[selectedView].proofOptions[field] === \\\"string\\\"}",
    		ctx
    	});

    	return block;
    }

    // (137:16) {#if typeof $output[selectedView].proofOptions[field] !== "string"}
    function create_if_block_4(ctx) {
    	let div;
    	let t;
    	let each_value_1 = Object.keys(/*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions[/*field*/ ctx[11]]);
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr_dev(div, "class", "flex-col flex");
    			add_location(div, file, 137, 18, 5603);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*decamelize, $output, selectedView*/ 22) {
    				each_value_1 = Object.keys(/*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions[/*field*/ ctx[11]]);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(137:16) {#if typeof $output[selectedView].proofOptions[field] !== \\\"string\\\"}",
    		ctx
    	});

    	return block;
    }

    // (139:20) {#each Object.keys($output[selectedView].proofOptions[field]) as subField}
    function create_each_block_1(ctx) {
    	let div;
    	let p0;

    	let t0_value = (/*decamelize*/ ctx[4](/*subField*/ ctx[14], " ")
    	? `${/*decamelize*/ ctx[4](/*subField*/ ctx[14], " ")}:`
    	: "") + "";

    	let t0;
    	let t1;
    	let p1;
    	let t2_value = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions[/*field*/ ctx[11]][/*subField*/ ctx[14]] + "";
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p0 = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			p1 = element("p");
    			t2 = text(t2_value);
    			attr_dev(p0, "class", "font-bold mr-2");
    			add_location(p0, file, 149, 24, 6257);
    			toggle_class(p1, "font-bold", !/*decamelize*/ ctx[4](/*subField*/ ctx[14], " "));
    			add_location(p1, file, 154, 24, 6486);
    			attr_dev(div, "class", "flex pl-2 ml-2 border-l-4 border-white");
    			toggle_class(div, "justify-center", !/*decamelize*/ ctx[4](/*subField*/ ctx[14], " "));
    			toggle_class(div, "border-b-4", Object.keys(/*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions[/*field*/ ctx[11]])[Object.keys(/*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions[/*field*/ ctx[11]]).length - 1] === /*subField*/ ctx[14]);
    			add_location(div, file, 139, 22, 5748);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p0);
    			append_dev(p0, t0);
    			append_dev(div, t1);
    			append_dev(div, p1);
    			append_dev(p1, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$output, selectedView*/ 6 && t0_value !== (t0_value = (/*decamelize*/ ctx[4](/*subField*/ ctx[14], " ")
    			? `${/*decamelize*/ ctx[4](/*subField*/ ctx[14], " ")}:`
    			: "") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$output, selectedView*/ 6 && t2_value !== (t2_value = /*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions[/*field*/ ctx[11]][/*subField*/ ctx[14]] + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*decamelize, $output, selectedView*/ 22) {
    				toggle_class(p1, "font-bold", !/*decamelize*/ ctx[4](/*subField*/ ctx[14], " "));
    			}

    			if (dirty[0] & /*decamelize, $output, selectedView*/ 22) {
    				toggle_class(div, "justify-center", !/*decamelize*/ ctx[4](/*subField*/ ctx[14], " "));
    			}

    			if (dirty[0] & /*$output, selectedView*/ 6) {
    				toggle_class(div, "border-b-4", Object.keys(/*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions[/*field*/ ctx[11]])[Object.keys(/*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions[/*field*/ ctx[11]]).length - 1] === /*subField*/ ctx[14]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(139:20) {#each Object.keys($output[selectedView].proofOptions[field]) as subField}",
    		ctx
    	});

    	return block;
    }

    // (126:14) {#each Object.keys($output[selectedView].proofOptions) as field}
    function create_each_block(ctx) {
    	let div;
    	let p;
    	let t0_value = /*decamelize*/ ctx[4](/*field*/ ctx[11], " ") + "";
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let if_block1_anchor;
    	let if_block0 = typeof /*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions[/*field*/ ctx[11]] === "string" && create_if_block_5(ctx);
    	let if_block1 = typeof /*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions[/*field*/ ctx[11]] !== "string" && create_if_block_4(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = text(": ");
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr_dev(p, "class", "capitalize font-bold");
    			add_location(p, file, 127, 18, 5145);
    			attr_dev(div, "class", "flex flex-wrap m-2");
    			add_location(div, file, 126, 16, 5094);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(div, t2);
    			if (if_block0) if_block0.m(div, null);
    			insert_dev(target, t3, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$output, selectedView*/ 6 && t0_value !== (t0_value = /*decamelize*/ ctx[4](/*field*/ ctx[11], " ") + "")) set_data_dev(t0, t0_value);

    			if (typeof /*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions[/*field*/ ctx[11]] === "string") {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_5(ctx);
    					if_block0.c();
    					if_block0.m(div, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (typeof /*$output*/ ctx[2][/*selectedView*/ ctx[1]].proofOptions[/*field*/ ctx[11]] !== "string") {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_4(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (detaching) detach_dev(t3);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(126:14) {#each Object.keys($output[selectedView].proofOptions) as field}",
    		ctx
    	});

    	return block;
    }

    // (36:0) <BasePage class="flex-col">
    function create_default_slot(ctx) {
    	let h1;
    	let t1;
    	let div4;
    	let textarea;
    	let t2;
    	let span;
    	let t4;
    	let div3;
    	let div1;
    	let div0;
    	let p0;
    	let t6;
    	let p1;
    	let t8;
    	let p2;
    	let t10;
    	let modeswitcher;
    	let t11;
    	let div2;
    	let current;
    	let mounted;
    	let dispose;
    	modeswitcher = new ModeSwitcher({ $$inline: true });
    	let if_block = /*$output*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Signing String Explainer";
    			t1 = space();
    			div4 = element("div");
    			textarea = element("textarea");
    			t2 = space();
    			span = element("span");
    			span.textContent = "→";
    			t4 = space();
    			div3 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "Content";
    			t6 = space();
    			p1 = element("p");
    			p1.textContent = "RDF";
    			t8 = space();
    			p2 = element("p");
    			p2.textContent = "N-quads";
    			t10 = space();
    			create_component(modeswitcher.$$.fragment);
    			t11 = space();
    			div2 = element("div");
    			if (if_block) if_block.c();
    			attr_dev(h1, "class", "w-full text-4xl mt-8 font-bold");
    			add_location(h1, file, 36, 2, 1300);
    			attr_dev(textarea, "class", "overflow-x-auto rounded-lg bg-gray-650 p-2 mr-4 w-1/4 resize-none");
    			add_location(textarea, file, 38, 4, 1413);
    			attr_dev(span, "class", "self-center text-4xl");
    			add_location(span, file, 43, 4, 1579);
    			attr_dev(p0, "class", "mx-2 cursor-pointer");
    			toggle_class(p0, "font-bold", /*selectedView*/ ctx[1] === "content");
    			toggle_class(p0, "underline", /*selectedView*/ ctx[1] === "content");
    			add_location(p0, file, 49, 10, 1845);
    			attr_dev(p1, "class", "mx-2 cursor-pointer");
    			toggle_class(p1, "font-bold", /*selectedView*/ ctx[1] === "rdf");
    			toggle_class(p1, "underline", /*selectedView*/ ctx[1] === "rdf");
    			add_location(p1, file, 57, 10, 2115);
    			attr_dev(p2, "class", "mx-2 cursor-pointer");
    			toggle_class(p2, "font-bold", /*selectedView*/ ctx[1] === "nquads");
    			toggle_class(p2, "underline", /*selectedView*/ ctx[1] === "nquads");
    			add_location(p2, file, 65, 10, 2369);
    			attr_dev(div0, "class", "flex w-full");
    			add_location(div0, file, 48, 8, 1809);
    			attr_dev(div1, "class", "flex bg-gray-600 rounded-lg rounded-b-none pt-2 px-2");
    			add_location(div1, file, 47, 6, 1734);
    			attr_dev(div2, "class", "p-4 overflow-auto h-full");
    			add_location(div2, file, 76, 6, 2685);
    			attr_dev(div3, "class", "w-3/4 flex rounded-lg bg-gray-650 ml-4 flex-col json-wrapper flex-grow");
    			add_location(div3, file, 44, 4, 1632);
    			attr_dev(div4, "class", "flex-grow flex mt-8");
    			add_location(div4, file, 37, 2, 1375);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, textarea);
    			set_input_value(textarea, /*message*/ ctx[0]);
    			append_dev(div4, t2);
    			append_dev(div4, span);
    			append_dev(div4, t4);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, div0);
    			append_dev(div0, p0);
    			append_dev(div0, t6);
    			append_dev(div0, p1);
    			append_dev(div0, t8);
    			append_dev(div0, p2);
    			append_dev(div1, t10);
    			mount_component(modeswitcher, div1, null);
    			append_dev(div3, t11);
    			append_dev(div3, div2);
    			if (if_block) if_block.m(div2, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[5]),
    					listen_dev(textarea, "input", /*input_handler*/ ctx[6], false, false, false),
    					listen_dev(p0, "click", /*click_handler*/ ctx[7], false, false, false),
    					listen_dev(p1, "click", /*click_handler_1*/ ctx[8], false, false, false),
    					listen_dev(p2, "click", /*click_handler_2*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*message*/ 1) {
    				set_input_value(textarea, /*message*/ ctx[0]);
    			}

    			if (dirty[0] & /*selectedView*/ 2) {
    				toggle_class(p0, "font-bold", /*selectedView*/ ctx[1] === "content");
    			}

    			if (dirty[0] & /*selectedView*/ 2) {
    				toggle_class(p0, "underline", /*selectedView*/ ctx[1] === "content");
    			}

    			if (dirty[0] & /*selectedView*/ 2) {
    				toggle_class(p1, "font-bold", /*selectedView*/ ctx[1] === "rdf");
    			}

    			if (dirty[0] & /*selectedView*/ 2) {
    				toggle_class(p1, "underline", /*selectedView*/ ctx[1] === "rdf");
    			}

    			if (dirty[0] & /*selectedView*/ 2) {
    				toggle_class(p2, "font-bold", /*selectedView*/ ctx[1] === "nquads");
    			}

    			if (dirty[0] & /*selectedView*/ 2) {
    				toggle_class(p2, "underline", /*selectedView*/ ctx[1] === "nquads");
    			}

    			if (/*$output*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*$output*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div2, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(modeswitcher.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(modeswitcher.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div4);
    			destroy_component(modeswitcher);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(36:0) <BasePage class=\\\"flex-col\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let basepage;
    	let current;

    	basepage = new BasePage({
    			props: {
    				class: "flex-col",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(basepage.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(basepage, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const basepage_changes = {};

    			if (dirty[0] & /*$output, selectedView, $objectView, message*/ 15 | dirty[1] & /*$$scope*/ 32) {
    				basepage_changes.$$scope = { dirty, ctx };
    			}

    			basepage.$set(basepage_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(basepage.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(basepage.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(basepage, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const classes = "underline justify-center border-b-4";

    function instance$2($$self, $$props, $$invalidate) {
    	let $output;
    	let $objectView;
    	validate_store(output, "output");
    	component_subscribe($$self, output, $$value => $$invalidate(2, $output = $$value));
    	validate_store(objectView, "objectView");
    	component_subscribe($$self, objectView, $$value => $$invalidate(3, $objectView = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Home", slots, []);
    	let message = "";
    	let selectedView = "content";

    	const decamelize = (str, separator) => {
    		separator = typeof separator === "undefined" ? "_" : separator;
    		return str.replace(/([a-z\d])([A-Z])/g, "$1" + separator + "$2").replace(/([A-Z]+)([A-Z][a-z\d]+)/g, "$1" + separator + "$2").toLowerCase();
    	};

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	function textarea_input_handler() {
    		message = this.value;
    		$$invalidate(0, message);
    	}

    	const input_handler = () => parse(message);
    	const click_handler = () => $$invalidate(1, selectedView = "content");
    	const click_handler_1 = () => $$invalidate(1, selectedView = "rdf");
    	const click_handler_2 = () => $$invalidate(1, selectedView = "nquads");

    	function jsontree_value_binding(value) {
    		if ($$self.$$.not_equal($output[selectedView], value)) {
    			$output[selectedView] = value;
    			output.set($output);
    		}
    	}

    	$$self.$capture_state = () => ({
    		BasePage,
    		message,
    		parse,
    		JSONTree: Root,
    		objectView,
    		output,
    		ModeSwitcher,
    		selectedView,
    		classes,
    		decamelize,
    		$output,
    		$objectView
    	});

    	$$self.$inject_state = $$props => {
    		if ("message" in $$props) $$invalidate(0, message = $$props.message);
    		if ("selectedView" in $$props) $$invalidate(1, selectedView = $$props.selectedView);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		message,
    		selectedView,
    		$output,
    		$objectView,
    		decamelize,
    		textarea_input_handler,
    		input_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		jsontree_value_binding
    	];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Tailwindcss.svelte generated by Svelte v3.38.2 */

    function create_fragment$1(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Tailwindcss", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Tailwindcss> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Tailwindcss extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tailwindcss",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.38.2 */

    function create_fragment(ctx) {
    	let tailwindcss;
    	let t;
    	let home;
    	let current;
    	tailwindcss = new Tailwindcss({ $$inline: true });
    	home = new Home({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(tailwindcss.$$.fragment);
    			t = space();
    			create_component(home.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(tailwindcss, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(home, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tailwindcss.$$.fragment, local);
    			transition_in(home.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tailwindcss.$$.fragment, local);
    			transition_out(home.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tailwindcss, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(home, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Home, Tailwindcss });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'world'
        }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
