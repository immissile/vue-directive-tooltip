import Utils from 'popper.js/dist/popper-utils';
import Popper from 'popper.js';

const BASE_CLASS = 'h-tooltip';
const PLACEMENT = ['top', 'left', 'right', 'bottom', 'auto'];

const DEFAULT_OPTIONS = {
    container: false,
    delay: 200,
    instance: null, // the popper.js instance
    eventsEnabled: true,
    html: false,
    modifiers: {
        arrow: {
            element: '.tooltip-arrow'
        }
    },
    placement: 'auto',
    placementPostfix: null, // start | end
    removeOnDestroy: true,
    title: '',
    class: '', // ex: 'tooltip-custom tooltip-other-custom'
    triggers: ['hover', 'focus'],
    offset: 5
};

export default class Tootlip {
    constructor (el, options = {}) {
        Tootlip._defaults = DEFAULT_OPTIONS;
        this._options = {
            ...Tootlip._defaults,
            ...{
                onCreate: (data) => {
                    this.content(this.tooltip.options.title);
                    this._$tt.update();
                },
                onUpdate: (data) => {
                    this.content(this.tooltip.options.title);
                    this._$tt.update();
                }
            },
            ...Tootlip.filterOptions(options)
        };

        const $tpl = this._createTooltipElement(this.options);
        document.querySelector('body').appendChild($tpl);

        this._$el = el;
        this._$tt = new Popper(el, $tpl, this._options);
        this._$tpl = $tpl;
        this._visible = false;
        this._clearDelay = null;
        this._setEvents();
    }

    destroy () {
        this._setEvents('remove');
        document.querySelector('body').removeChild(this._$tpl);
    }

    get options () {
        return {...this._options};
    }

    get tooltip () {
        return this._$tt;
    }

    _createTooltipElement (options) {
        // wrapper
        let $popper = document.createElement('div');
        $popper.setAttribute('id', `tooltip-${randomId()}`);
        $popper.setAttribute('class', `${BASE_CLASS} ${this._options.class}`);
        Utils.setStyles($popper, {display: 'none'});

        // make arrow
        let $arrow = document.createElement('div');
        $arrow.setAttribute('class', 'tooltip-arrow');
        $arrow.setAttribute('x-arrow', '');
        $popper.appendChild($arrow);

        // make content container
        let $content = document.createElement('div');
        $content.setAttribute('class', 'tooltip-content');
        $popper.appendChild($content);

        return $popper;
    }

    _setEvents (state = 'add') {
        if (!Array.isArray(this.options.triggers)) {
            console.error('trigger should be an array', this.options.triggers);
            return;
        }
        let lis = null;
        if (state === 'add') {
            lis = (...params) => this._$el.addEventListener(...params);
        } else {
            lis = (...params) => this._$el.removeEventListener(...params);
        }

        if (this.options.triggers.includes('manual')) {
            lis('click', this._onToggle.bind(this), false);
        } else {
            this.options.triggers.map(evt => {
                switch (evt) {
                case 'click':
                    lis('click', this._onToggle.bind(this), false);
                    if (state === 'add') {
                        document.addEventListener('click', this._onDeactivate.bind(this), false);
                    } else {
                        document.removeEventListener('click', this._onDeactivate.bind(this), false);
                    }
                    break;
                case 'hover':
                    lis('mouseenter', this._onActivate.bind(this), false);
                    lis('mouseleave', this._onDeactivate.bind(this), true);

                    this._$tt.popper.addEventListener('mouseenter', this._onActivate.bind(this), true);
                    this._$tt.popper.addEventListener('mouseleave', this._onDeactivate.bind(this), true);
                    break;
                case 'focus':
                    lis('focus', this._onActivate.bind(this), false);
                    lis('blur', this._onDeactivate.bind(this), true);

                    this._$tt.popper.addEventListener('mouseenter', this._onActivate.bind(this), true);
                    this._$tt.popper.addEventListener('mouseleave', this._onDeactivate.bind(this), true);
                    break;
                }
            });
        }
    }

    _cleanEvents () {
        const eal = (...params) => this._$el.removeEventListener(...params);

        if (this.options.triggers.includes('manual')) {
            eal('click', this._onToggle.bind(this), false);
        } else {
            this.options.triggers.map(evt => {
                switch (evt) {
                case 'click':
                    eal('click', this._onToggle.bind(this), false);
                    document.addEventListener('click', this._onDeactivate.bind(this), false);
                    break;
                case 'hover':
                    eal('mouseenter', this._onActivate.bind(this), false);
                    eal('mouseleave', this._onDeactivate.bind(this), true);

                    this._$tt.popper.removeEventListener('mouseenter', this._onActivate.bind(this), true);
                    this._$tt.popper.removeEventListener('mouseleave', this._onDeactivate.bind(this), true);
                    break;
                case 'focus':
                    eal('focus', this._onActivate.bind(this), false);
                    eal('blur', this._onDeactivate.bind(this), true);

                    this._$tt.popper.removeEventListener('mouseenter', this._onActivate.bind(this), true);
                    this._$tt.popper.removeEventListener('mouseleave', this._onDeactivate.bind(this), true);
                    break;
                }
            });
        }
    }

    _onActivate (e) {
        this.show();
    }

    _onDeactivate (e) {
        this.hide();
    }

    _onToggle (e) {
        e.stopPropagation();
        e.preventDefault();
        this.toggle();
    }

    content (content) {
        const wrapper = this.tooltip.popper.querySelector('.tooltip-content');
        if (typeof content === 'string') {
            this.tooltip.options.title = content;
            wrapper.textContent = content;
        } else if (isElement(content)) {
            if (content !== wrapper.children[0]) {
                wrapper.innerHTML = '';
                wrapper.appendChild(content);
            }
            // var clonedNode = content.cloneNode(true);
            // this.tooltip.options.title = clonedNode;
            // if (isElement(content.parentNode)) {
            //     content.parentNode.removeChild(content);
            // }
        } else {
            console.error('unsupported content type', content);
        }
    }

    static filterOptions (options) {
        let opt = {...options};

        opt.modifiers = {};
        opt.placement = PLACEMENT.includes(options.placement) ? options.placement : 'auto';

        opt.modifiers.offset = {
            fn: Tootlip._setOffset
        };

        return opt;
    }

    static _setOffset (data, opts) {
        let offset = data.instance.options.offset;

        if (window.isNaN(offset) || offset < 0) {
            offset = Tootlip._defaults.offset;
        }

        switch (data.placement) {
        case 'top': data.offsets.popper.top -= offset; break;
        case 'right': data.offsets.popper.left += offset; break;
        case 'bottom': data.offsets.popper.top += offset; break;
        case 'left': data.offsets.popper.left -= offset; break;
        }

        return data;
    }

    static defaults (data) {
        Tootlip._defaults = {...Tootlip._defaults, ...data};
    }

    show () {
        this.toggle(true);
    }

    hide () {
        this.toggle(false);
    }

    toggle (val) {
        let delay = this._options.delay;

        if (typeof val !== 'boolean') {
            val = !this._visible;
        }

        if (val === true) {
            delay = 0;
        }

        clearTimeout(this._clearDelay);

        this._clearDelay = setTimeout(() => {
            this._visible = val;
            this._$tt.popper.style.display = (this._visible === true) ? 'inline-block' : 'none';
            this._$tt.update();
        }, delay);
    }
}

Tootlip._defaults = DEFAULT_OPTIONS;

function randomId () {
    return `${Date.now()}-${Math.round(Math.random() * 100000000)}`;
}

/**
 * Check if the variable is an html element
 * @param {*} value
 * @return Boolean
 */
function isElement (value) {
    return value instanceof window.Element;
}
