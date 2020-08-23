# Customized Form Validator

Customized version of <a href="https://github.com/1000hz/bootstrap-validator">Validator v0.11.5 for Bootstrap 3 (by @1000hz)</a>.

This Javascript validator is being used to validate one of our web application which is a single page application. As the project validation becoming complex, the validator is becoming complex too. So the validator basiclly exhanced. Since this is highly customized, so it wasn't sent to the original repo as a pull request.

Enhanced validations:
* (Remote validation): set the url on the input element to validate it from server.
* requiredif : the input element will become required based on another control's value.
* exactLengths : input value have to be of mentioned length or any of the legnths from a comma separated length list.
