/*!
 * Validator v0.11.5 for Bootstrap 3, by @1000hz
 * Copyright 2016 Cina Saffary
 * Licensed under http://opensource.org/licenses/MIT
 *
 * https://github.com/1000hz/bootstrap-validator
 */

/*
	Customized  --tareqnewazshahriar

	New validations:
	- requiredif	: the element input will be required based on other controls value
	- exactLengths	: input value have to be any of the given lengths (lengths can be given as comma separated values)
	
	Modifications:
	- Html supported error text is set as default
	
	TODO
	----------
	- if 'requiredif' target control's value changed and make it not-required then 
		the errors of 'requiredif' control should be cleared.

	Done Todo
	----------
	- [done] If data-requiredif-val is not set for requiredif validation,
		then just check not empty value for requriedif selector element.
	- [done] set validity property for ajax validation
*/

/*
	HOW TO ADD NEW VALIDATION USING HTML DATA-* API
	-------------------------------------------
	1. Add property to Validator.DEFAULTS.errors same name as suffix of 'data-'.
	2. Define validation logic in Validator.VALIDATORS object.
	3. Add reuired checks on each input element traversal logic of $.each().. in Validator.prototype.runValidators
*/

+function ($)
{
	'use strict';

	// VALIDATOR CLASS DEFINITION
	// ==========================

	function getValue($el)
	{
		return $el.is('[type="checkbox"]') ?
			$el.prop('checked')
			: $el.is('[type="radio"]') ?
					!!$('[name="' + $el.attr('name') + '"]:checked').length
					: $el.val()
	}

	var Validator = function (element, options)
	{
		this.options = options
		this.validators = $.extend({}, Validator.VALIDATORS, options.custom)
		this.$element = $(element)
		this.$btn = $('button[type="submit"], input[type="submit"]')
							.filter('[form="' + this.$element.attr('id') + '"]')
							.add(this.$element.find('input[type="submit"], button[type="submit"]'))

		this.update()

		this.$element.on('input.bs.validator change.bs.validator focusout.bs.validator', $.proxy(this.onInput, this))
		this.$element.on('submit.bs.validator', $.proxy(this.onSubmit, this))
		this.$element.on('reset.bs.validator', $.proxy(this.reset, this))

		this.$element.find('[data-match]').each(function ()
		{
			var $this = $(this)
			var target = $this.data('match')

			$(target).on('input.bs.validator', function (e)
			{
				getValue($this) && $this.trigger('input.bs.validator')
			})
		})

		this.$inputs.filter(function () { return getValue($(this)) }).trigger('focusout')

		this.$element.attr('novalidate', true) // disable automatic native validation
		this.toggleSubmit()
	}

	Validator.VERSION = '0.11.5'

	Validator.INPUT_SELECTOR = ':input:not([type="hidden"], [type="submit"], [type="reset"], button)'

	Validator.FOCUS_OFFSET = 20

	Validator.DEFAULTS = {
		delay: 500,
		html: true,
		disable: false,
		focus: true,
		custom: {},
		errors: {
			//remote: '---',
			match: 'Does not match',
			minlength: 'Not long enough',
			exactLengths: 'Length not matched',
			requiredif: 'Please fill out this field'
		},
		feedback: {
			success: 'glyphicon-ok',
			error: 'glyphicon-remove'
		}
	}

	Validator.VALIDATORS = {
		'native': function ($el)
		{
			var el = $el[0]
			if (el.checkValidity)
			{
				return !el.checkValidity()
					&& !el.validity.valid
					&& !el.validity.customError		// ensure that it is a native error
					&& (el.validationMessage || "error!")
			}
		},
		//'remote': function ($el)
		//{
		//	return $el[0].isRemoteValid === false && $el.data('remote')
		//},
		'match': function ($el)
		{
			var target = $el.data('match')
			return $el.val() !== $(target).val() && Validator.DEFAULTS.errors.match
		},
		'minlength': function ($el)
		{
			var minlength = $el.data('minlength')
			return $el.val().length < minlength && Validator.DEFAULTS.errors.minlength
		},
		'exactLengths': function ($el)
		{
			var vals = $el.data('exactLengths').toString().split(',')
			var elemLen = $el.val().length.toString()

			return (vals.findIndex(function (val, i) { return val == elemLen }) == -1
				&& Validator.DEFAULTS.errors.exactLengths)
		},
		'requiredif': function ($el)
		{
			var $target = $($el.data('requiredif'))
			var val = $el.data('requiredif-val')
			var targetVal = getValue($target)
			return ((((!val && targetVal)					// no required val mentioned, so if any value selected
						|| (val && targetVal.toString() == val.toString()))		// OR if the predefined value selected
					&& !$el.val().trim())						// BUT if the current element is empty
					&& Validator.DEFAULTS.errors.requiredif)	// THEN validation failed and pass the error message
		}
	}

	Validator.prototype.update = function ()
	{
		this.$inputs = this.$element.find(Validator.INPUT_SELECTOR)
		  .add(this.$element.find('[data-validate="true"]'))
		  .not(this.$element.find('[data-validate="false"]'))

		return this
	}

	Validator.prototype.onInput = function (e)
	{
		var self = this
		var $el = $(e.target)
		var deferErrors = e.type !== 'focusout'

		if (!this.$inputs.is($el)) return

		this.validateInput($el, deferErrors).done(function ()
		{
			self.toggleSubmit()
		})
	}

	Validator.prototype.validateInput = function ($el, deferErrors)
	{
		var value = getValue($el)
		var prevErrors = $el.data('bs.validator.errors')
		var errors

		// if remote validation error, upon clearing the text remove it
		if ($el[0].isRemoteValid === false && !value)
		{
			$el[0].setCustomValidity('')
			$el[0].isRemoteValid = true;
		}

		if ($el.is('[type="radio"]')) $el = this.$element.find('input[name="' + $el.attr('name') + '"]')

		var e = $.Event('validate.bs.validator', { relatedTarget: $el[0] })
		this.$element.trigger(e)
		if (e.isDefaultPrevented()) return

		var self = this

		return this.runValidators($el).done(function (errors)
		{
			$el.data('bs.validator.errors', errors)

			errors.length
			  ? deferErrors ? self.defer($el, self.showErrors) : self.showErrors($el)
			  : self.clearErrors($el)

			if (!prevErrors || errors.toString() !== prevErrors.toString())
			{
				e = errors.length
				  ? $.Event('invalid.bs.validator', { relatedTarget: $el[0], detail: errors })
				  : $.Event('valid.bs.validator', { relatedTarget: $el[0], detail: prevErrors })

				self.$element.trigger(e)
			}

			self.toggleSubmit()

			self.$element.trigger($.Event('validated.bs.validator', { relatedTarget: $el[0] }))
		})
	}


	Validator.prototype.runValidators = function ($el)
	{
		var errors = []
		var deferred = $.Deferred()

		$el.data('bs.validator.deferred') && $el.data('bs.validator.deferred').reject()
		$el.data('bs.validator.deferred', deferred)

		function getValidatorSpecificError(key)
		{
			return $el.data(key + '-error')
		}

		function getValidityStateError()
		{
			var validity = $el[0].validity
			return validity.typeMismatch ? $el.data('type-error')
				 : validity.patternMismatch ? $el.data('pattern-error')
				 : validity.stepMismatch ? $el.data('step-error')
				 : validity.rangeOverflow ? $el.data('max-error')
				 : validity.rangeUnderflow ? $el.data('min-error')
				 : validity.valueMissing ? $el.data('required-error')
				 : null
		}

		function getGenericError()
		{
			return $el.data('error')
		}

		function getErrorMessage(key)
		{
			return getValidatorSpecificError(key)
				|| getValidityStateError()
				|| getGenericError()
		}

		// all client-side validations on current element
		$.each(this.validators, $.proxy(function (key, validator)
		{
			var error = null
			if (($el.attr('required') || $el.data('requiredif') || getValue($el))	// if field is required or it has a value inputed
				&& (key == 'native' || $el.data(key))					// and native or custom validation exists
				&& (error = validator.call(this, $el)))					// then check current validation and if error found then... enter into the block
			{
				error = getErrorMessage(key) || error
				!~errors.indexOf(error) && errors.push(error)
			}
			// for custom errors, set/unset validity
			if (key != 'native' || $el[0].validity.customError)
			{
				if (error)
					$el[0].setCustomValidity(errors)
				else if ($el[0].validity.customError && $el[0].isRemoteValid !== false)
					$el[0].setCustomValidity('')
			}
		}, this))

		// remote validation
		var currentVal = getValue($el)
		var oldVal = $el.data('own-val')
		if ($el.skipRemoteValidationOnce !== true		// if manually validation called or submit button clicked, skip remote validations
			&& errors.length == 0
			// || (errors.length==1 && $el[0].isRemoteValid===false))	// there's only remote validation error
			&& $el.data('remote') !== undefined			// remote validation exists on that element
			&& $el.is(':focus') == false				// input element lost its focus
			&& currentVal								// value exists
			&& (!oldVal || currentVal != oldVal.toString())	// this is not its own-valid value (useful when opened for editting))
			&& this.options.remote[$el.attr('name')])	// and required option data exists
		{
			$el[0].setCustomValidity('Remote validation is in progress...')
			$el[0].isRemoteValid = false
			this.defer($el, function ()
			{
				var success = this.options.feedback.success
				var optionObj = this.options.remote[$el.attr('name')]
				var data = $.extend(true, {}, optionObj.data) // jquery deep cloning
				for (var key in data)	// find replacable '<..>' value and replace it
				{
					if (data[key][0] == '<')
					{
						var key2 = data[key].substring(1, data[key].indexOf('>'))
						data[key] = (key2 == 'value' ? currentVal : $el.attr(key2))
					}
				}
				$.post(optionObj.url, data, null, null, optionObj.loaderParentSelector)
					.success(function (data, status)
					{
						if (data && data.status === 'success')
						{
							$el.parent().find('.form-control-feedback').addClass(success)
							$el[0].setCustomValidity('')
							$el[0].isRemoteValid = true
						}
						else if (data && data.status === 'error')
						{
							//if (errors.length == 1)	// remove previous remote validation error
							//	errors.pop()
							errors.push(getErrorMessage('remote') || $el.data('remote'))
							$el.parent().find('.form-control-feedback').removeClass(success)
							$el[0].setCustomValidity($el.data('remote'))
							$el[0].isRemoteValid = false
						}
					})
					.fail(function (jqXHR, textStatus, error)
					{
						//if (errors.length == 1)	// if only one error exist, it is remote validity error, remove it
						//	errors.pop()
						var errText = 'Server or network error occurred! Please try again. <span style="font-size:5px"> (' + error + ')</span>'
						errors.push(errText)
						$el[0].setCustomValidity(error)
						$el[0].isRemoteValid = false
					})
					.always(function (data, status)
					{
						deferred.resolve(errors)
					})
			})
		}
		else	// if not entered into remote validation, deferred resolver should be called
		{
			if ($el.data('remote') !== undefined	// on edit mode, after modifications if old inputted again make the control valid
				&& (!oldVal || currentVal == oldVal.toString()))
			{
				$el[0].isRemoteValid = true
			}

			delete $el.skipRemoteValidationOnce	// if exists
			deferred.resolve(errors)
		}
		
		return deferred.promise()
	}

	Validator.prototype.validate = function ()
	{
		var self = this
		$.when(this.$inputs.map(function (el)
		{
			var $el = $(this);
			if($el.data('remote'))
				$el.skipRemoteValidationOnce = true
			return self.validateInput($el, false)
		})).then(function ()
		{
			self.toggleSubmit()
			self.focusError()
		})

		return this
	}

	Validator.prototype.focusError = function ()
	{
		if (!this.options.focus) return

		var $input = this.$element.find(".has-error:first :input")
		if ($input.length === 0) return

		$('html, body').animate({ scrollTop: $input.offset().top - Validator.FOCUS_OFFSET }, 250)
		$input.focus()
	}

	Validator.prototype.showErrors = function ($el)
	{
		var errors = $el.data('bs.validator.errors')
		if (!errors.length)
			return

		var method = this.options.html ? 'html' : 'text'
		var $group = $el.closest('.form-group')
		var $block = $group.find('.help-block.with-errors')
		var $feedback = $group.find('.form-control-feedback')

		// [update: this block of code is not necessary]
		// adding a separate error just to show another message is not a good idea, 
		// but the error array may contain multiple errors how to evaluate 'remote' 
		// error and add the extra messge to it!!
		//if ($el.data('remote') !== undefined && $el[0].isRemoteValid == false)
		//	errors.push('(Invalid value: ' + getValue($el) + ')');

		errors = $('<ul/>')
		  .addClass('list-unstyled')
		  .append($.map(errors, function (error) { return $('<li/>')[method](error) }))

		$block.data('bs.validator.originalContent') === undefined && $block.data('bs.validator.originalContent', $block.html())
		$block.empty().append(errors)
		$group.addClass('has-error has-danger')
		
		$group.hasClass('has-feedback')
		  //&& $feedback.removeClass(this.options.feedback.success)
		  && $feedback.addClass(this.options.feedback.error)
		  //&& $group.removeClass('has-success')
	}

	Validator.prototype.clearErrors = function ($el)
	{
		// [update: this block of code is not necessary]
		// if value exist in element and remote validation error exist, RETURN
		//if (getValue($el) && $el[0].isRemoteValid === false)
		//	return

		var $group = $el.closest('.form-group')
		var $block = $group.find('.help-block.with-errors')
		var $feedback = $group.find('.form-control-feedback')

		$block.html($block.data('bs.validator.originalContent'))
		//$group.removeClass('has-error has-danger has-success')
		$group.removeClass('has-error has-danger')

		$group.hasClass('has-feedback')
		  && $feedback.removeClass(this.options.feedback.error)
		  //&& $feedback.removeClass(this.options.feedback.success)
		  && getValue($el)
		  //&& $feedback.addClass(this.options.feedback.success)
		  //&& $group.addClass('has-success')
	}

	Validator.prototype.hasErrors = function ()
	{
		function fieldErrors()
		{
			return !!($(this).data('bs.validator.errors') || []).length
		}

		return !!this.$inputs.filter(fieldErrors).length
	}

	Validator.prototype.isIncomplete = function ()
	{
		function fieldIncomplete()
		{
			var value = getValue($(this))
			return !(typeof value == "string" ? $.trim(value) : value)
		}

		return !!this.$inputs.filter('[required]').filter(fieldIncomplete).length
	}

	Validator.prototype.onSubmit = function (e)
	{
		this.validate()
		if (this.isIncomplete() || this.hasErrors()) e.preventDefault()
	}

	Validator.prototype.toggleSubmit = function ()
	{
		if (!this.options.disable) return
		this.$btn.toggleClass('disabled', this.isIncomplete() || this.hasErrors())
	}

	Validator.prototype.defer = function ($el, callback)
	{
		callback = $.proxy(callback, this, $el)
		if (!this.options.delay) return callback()
		window.clearTimeout($el.data('bs.validator.timeout'))
		$el.data('bs.validator.timeout', window.setTimeout(callback, this.options.delay))
	}

	Validator.prototype.reset = function ()
	{
		this.$element.find('.form-control-feedback')
		  .removeClass(this.options.feedback.error)
		  //.removeClass(this.options.feedback.success)

		this.$inputs
		  .removeData(['bs.validator.errors', 'bs.validator.deferred'])
		  .each(function ()
		  {
		  	var $this = $(this)
		  	var timeout = $this.data('bs.validator.timeout')
		  	window.clearTimeout(timeout) && $this.removeData('bs.validator.timeout')
		  })

		this.$element.find('.help-block.with-errors')
		  .each(function ()
		  {
		  	var $this = $(this)
		  	var originalContent = $this.data('bs.validator.originalContent')

		  	$this
			  .removeData('bs.validator.originalContent')
			  .html(originalContent)
		  })

		this.$btn.removeClass('disabled')

		//this.$element.find('.has-error, .has-danger, .has-success').removeClass('has-error has-danger has-success')
		this.$element.find('.has-error, .has-danger').removeClass('has-error has-danger')

		return this
	}

	Validator.prototype.destroy = function ()
	{
		this.reset()

		this.$element
		  .removeAttr('novalidate')
		  .removeData('bs.validator')
		  .off('.bs.validator')

		this.$inputs
		  .off('.bs.validator')

		this.options = null
		this.validators = null
		this.$element = null
		this.$btn = null

		return this
	}

	// VALIDATOR PLUGIN DEFINITION
	// ===========================


	function Plugin(option)
	{
		return this.each(function ()
		{
			var $this = $(this)
			var options = $.extend({}, Validator.DEFAULTS, $this.data(), typeof option == 'object' && option)
			var data = $this.data('bs.validator')

			if (!data && option == 'destroy') return
			if (!data) $this.data('bs.validator', (data = new Validator(this, options)))
			if (typeof option == 'string') data[option]()
		})
	}

	var old = $.fn.validator

	$.fn.validator = Plugin
	$.fn.validator.Constructor = Validator


	// VALIDATOR NO CONFLICT
	// =====================

	$.fn.validator.noConflict = function ()
	{
		$.fn.validator = old
		return this
	}


	// VALIDATOR DATA-API
	// ==================

	$(window).on('load', function ()
	{
		$('form[data-toggle="validator"]').each(function ()
		{
			var $form = $(this)
			Plugin.call($form, $form.data())
		})
	})

}(jQuery);
