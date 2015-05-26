
function AccountValidator(){

// build array maps of the form inputs & control groups //

	this.formFields = [$('#email-tf'), $('#user-tf'), $('#pass-tf'), $('#pass-tf-c')];
	
// bind the form-error modal window to this controller to display any errors //
	
	this.alert = $('.alert');
	
	this.validateUser = function(s)
	{
		return s.length >= 3;
	};
	
	this.validatePassword = function(s)
	{
	// if user is logged in and hasn't changed their password, return ok
		return s.length >= 6;


	};

	this.validatePasswordMatch = function(s,q)
	{
		return s===q;
	};
	
	this.validateEmail = function(e)
	{
		var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return re.test(e);
	};
	
	this.showErrors = function(a)
	{
		var ul = "";
		for (var i=0; i < a.length; i++){ ul += '<li>'+a[i]+'</li>';}
		this.alert.fadeOut(function(){
			$('.alert p').text('Please correct the following problems :').append(ul);
		});
		this.alert.fadeIn();
	};

}

AccountValidator.prototype.showInvalidEmail = function()
{
	this.showErrors(['That email address is already in use.']);
};

AccountValidator.prototype.showInvalidUserName = function()
{
	this.showErrors(['That username is already in use.']);
};

AccountValidator.prototype.validateForm = function()
{
	var e = [];
	if (this.validateEmail(this.formFields[0].val()) == false) {
		e.push('Your email is not valid.');
	}
	if (this.validateUser(this.formFields[1].val()) == false) {
		e.push('Your username should contain at least three characters.');
	}
	if (this.validatePassword(this.formFields[2].val()) == false) {
		e.push('Your password should contain at least six characters.');
	}
	if (this.validatePasswordMatch(this.formFields[2].val(),this.formFields[3].val()) == false) {
		e.push('Passwords do not match.');
	}

	if (e.length) this.showErrors(e);
	return e.length === 0;
};