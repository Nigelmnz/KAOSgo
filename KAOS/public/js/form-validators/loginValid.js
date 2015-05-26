
function LoginValidator(){

// bind a simple alert window to this controller to display any errors //

	this.loginErrors = $('.alert');

	this.showLoginError = function(m)
	{
		this.loginErrors.fadeOut(function(){
			$('.alert p').text(m);
		});
		this.loginErrors.fadeIn();
	};

}

//Check if anything was left blank

LoginValidator.prototype.validateForm = function()
{
	if ($('#user-tf').val() == ''){
		this.showLoginError('Please enter a valid username');
		return false;
	}	else if ($('#pass-tf').val() == ''){
		this.showLoginError('Please enter a valid password');
		return false;
	}	else{
		return true;
	}
};