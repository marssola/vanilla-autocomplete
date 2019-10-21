const VanillaAutoComplete = (() => {
    function VanillaAutoComplete(options) {
        if (!document.querySelector) {
            throw 'document.querySelector required'
            return
        }
            
        const hasClass = (el, className) => {
            return el.classList ? el.classList.contains(className) : new RegExp('\\b' + className + '\\b').test(el.className)
        }
        
        const addEvent = (el, type, handler) => {
            if (!el) return
            if (el.attachEvent) el.attachEvent('on' + type, handler)
            else el.addEventListener(type, handler);
        }
        const removeEvent = (el, type, handler) => {
            if (!el) return
            if (el.detachEvent) el.detachEvent('on' + type, handler)
            else el.removeEventListener(type, handler);
        }
        
        const live = (elClass, event, cb, context) => {
            addEvent(context || document, event, (e) => {
                let found, el = e.target || e.srcElement
                while (el && !(found = hasClass(el, elClass)))
                    el = el.parentElement
                if (found)
                    cb.call(el, e)
            })
        }
        
        let opts = {
            selector: null,
            source: null,
            minChars: 3,
            delay: 50,
            offsetLeft: 0,
            offsetTop: 1,
            menuClass: '',
            data: [],
            renderKey: null,
            renderItem: (item, search) => {
                search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
                let rep = new RegExp("(" + search.split(' ').join('|') + ")", "gi")
                if (typeof item === 'object') {
                    return `<div class="vanilla-autocomplete-suggestion" data-value='${JSON.stringify(item)}' data-string='${opts.renderObjToStr(item)}'>${item[opts.renderKey].replace(rep, "<b>$1</b>")}</div>`
                } else if (typeof item === 'string') {
                    return '<div class="vanilla-autocomplete-suggestion" data-value="' + item + '">' + item.replace(rep, "<b>$1</b>") + '</div>'
                }
                return ''
            },
            onSelect: (data, item, event) => {},
            renderObjToStr: data => {return ''},
        }
        for (let k in options) if (options.hasOwnProperty(k)) opts[k] = options[k]
        
        let element = null
        if (typeof opts.selector === 'object') element = opts.selector
        else if (typeof opts.selector === 'string') element = document.querySelector(opts.selector)
        if (!element) {
            throw 'Selector is required'
            return
        }
        
        // suggestions container "sc"
        element.sc = document.createElement('div')
        element.sc.className = `vanilla-autocomplete-suggestions ${opts.menuClass}`
        element.autocompleteAttr = element.getAttribute('autocomplete')
        element.setAttribute('autocomplete', 'off')
        element.last_value = ''
        
        element.updateSC = (resize, next) => {
            let rect = element.getBoundingClientRect()
            element.sc.style.left = Math.round(rect.left + (window.pageXOffset || document.documentElement.scrollLeft) + opts.offsetLeft) + 'px'
            element.sc.style.top = Math.round(rect.bottom + (window.pageYOffset || document.documentElement.scrollTop) + opts.offsetTop) + 'px'
            element.sc.style.width = Math.round(rect.right - rect.left) + 'px'
            
            if (!resize) {
                element.sc.style.display = 'block'
                if (!element.sc.maxHeight) 
                    element.sc.maxHeight = parseInt((window.getComputedStyle ? getComputedStyle(element.sc, null) : element.sc.currentStyle).maxHeight)
                if (!element.sc.suggestionHeight)
                    element.sc.suggestionHeight = element.sc.querySelector('.vanilla-autocomplete-suggestion').offsetHeight
                if (element.sc.suggestionHeight)
                    if (!next) {
                        element.sc.scrollTop = 0
                    } else {
                        let scrTop = element.sc.scrollTop, selTop = next.getBoundingClientRect().top - element.sc.getBoundingClientRect().top
                        if (selTop + element.sc.suggestionHeight - element.sc.maxHeight > 0)
                            element.sc.scrollTop = selTop + element.sc.suggestionHeight + scrTop - element.sc.maxHeight
                        else if (selTop < 0)
                            element.sc.scrollTop = selTop + scrTop
                    }
            }
        }
        addEvent(window, 'resize', element.updateSC)
        document.body.appendChild(element.sc)
        
        live('vanilla-autocomplete-suggestion', 'mouseleave', function(e) {
            let selector = element.sc.querySelector('.vanilla-autocomplete-suggestion.selected')
            if (selector)
                setTimeout(() => {selector.className = selector.className.replace(/selected/, '')}, 20)
        }, element.sc)
        
        live('vanilla-autocomplete-suggestion', 'mouseover', function(e) {
            let selector = element.sc.querySelector('.vanilla-autocomplete-suggestion.selected')
            if (selector)
                selector.className = selector.className.replace(/selected/, '')
            this.className += ' selected'
        }, element.sc)

        live('vanilla-autocomplete-suggestion', 'mousedown', function(e) {
            if (hasClass(this, 'vanilla-autocomplete-suggestion')) {
                element.value = this.getAttribute('data-string') ? this.getAttribute('data-string') : this.getAttribute('data-value')
                opts.onSelect(this.getAttribute('data-value'), this, e)
                element.sc.style.display = 'none'
            }
        }, element.sc)
        
        element.blurHandler = () => {
            let over_sb = null
            try {over_sb = document.querySelector('.vanilla-autocomplete-suggestion:hover')} catch (err) {}
            if (!over_sb) {
                element.last_value = element.value
                element.sc.style.display = 'none'
                setTimeout(() => {element.sc.style.display = 'none'}, 350)
            } else if (element !== document.activeElement) {
                setTimeout(() => {element.focus()}, 20)
            }
        }
        addEvent(element, 'blur', element.blurHandler)
        
        let suggest = data => {
            if (!data)
                return
            let value = element.value
            if (data.length && value.length >= opts.minChars) {
                let s = ''
                for (let i = 0; i < data.length; ++i)
                    s += opts.renderItem(data[i], value)
                element.sc.innerHTML = s
                element.updateSC(0)
            } else {
                element.sc.style.display = 'none'
            }
        }
        
        element.keydownHandler = e => {
            let key = window.event ? e.keyCode : e.which
            // down = 40, up = 38, esc = 27, enter = 13, 9
            if ((key === 40 || key === 38) && element.sc.innerHTML) {
                let next, selector = element.sc.querySelector('.vanilla-autocomplete-suggestion.selected')
                if (!selector) {
                    next = (key === 40) ? element.sc.querySelector('.vanilla-autocomplete-suggestion') : element.sc.childNodes[element.sc.childNodes.length - 1]
                    next.className += ' selected'
                    element.value = next.getAttribute('data-string') ? next.getAttribute('data-string') : next.getAttribute('data-value')
                } else {
                    next = (key === 40) ? selector.nextSibling : selector.previousSibling
                    if (next) {
                        selector.className = selector.className.replace(/selected/, '')
                        next.className += ' selected'
                        element.value = next.getAttribute('data-string') ? next.getAttribute('data-string') : next.getAttribute('data-value')
                    } else {
                        selector.className = selector.className.replace(/selected/, '')
                        element.value = element.last_value
                        next = null
                    }
                }
                element.updateSC(0, next)
                return false
            } else if (key === 27) {
                element.value = element.last_value
                element.sc.style.display = 'none'
            } else if (key === 13 || key === 9) {
                let selector = element.sc.querySelector('.vanilla-autocomplete-suggestion.selected')
                if (selector && element.sc.style.display !== 'none') {
                    opts.onSelect(selector.getAttribute('data-value'), selector, e)
                    setTimeout(() => {element.sc.style.display = 'none'}, 20)
                }
            }
        }
        addEvent(element, 'keydown', element.keydownHandler)
            
        element.keyupHandler = e => {
            let key = window.event ? e.keyCode : e.which
            if (!key || (key < 35 || key > 40) && key != 13 && key != 27) {
                let value = element.value
                if (value.length >= opts.minChars) {
                    if (value != element.last_value) {
                        element.last_value = value
                        clearTimeout(element.timer)
                        element.timer = setTimeout(() => { 
                            opts.source(value, suggest)
                        }, opts.delay)
                    }
                } else {
                    element.last_value = value
                    element.sc.style.display = 'none'
                }
            }
        }
        addEvent(element, 'keyup', element.keyupHandler)
        
        element.focusHandler = function (e) {
            element.last_value = '\n'
            element.keyupHandler(e)
        }
        if (!opts.minChars)
            addEvent(element, 'focus', element.focusHandler)
        
        this.destroy = () => {
            removeEvent(window, 'resize', element.updateSC)
            removeEvent(element, 'blur', element.blurHandler)
            removeEvent(element, 'focus', element.focusHandler)
            removeEvent(element, 'keydown', element.keydownHandler)
            removeEvent(element, 'keyup', element.keyupHandler)
            if (!element.autocompleteAttr)
                element.setAttribute('autocomplete', element.autocompleteAttr)
            else
                element.removeAttribute('autocomplete')
            document.body.removeChild(element.sc)
        }
    }
    return VanillaAutoComplete
})()
window.VanillaAutoComplete = VanillaAutoComplete
