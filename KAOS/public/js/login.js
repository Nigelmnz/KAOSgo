$(document).ready(function(){
	
	var lv = new LoginValidator();
	var av = new AccountValidator();
	var safe = true;


	//Responsive Mobile Stuff
    // $("#info-container").hide();



    //Show Extended Info
 //    var showing = false;

 //    $( "#logo" ).click(function() {

 //      if(showing){
 //      	showing = false;
 //      	$( "#login-container" ).animate({
	// 		"margin-top": "-13em"
	// 	}, 1000, function(){});

 //      }else{
 //      	showing = true;
	// 	$( "#login-container" ).animate({
	// 		"margin-top": "-23em"
	// 	}, 1000, function(){});
 //      }
	// });


	//Login Smoothness 
	var isUp = true;
	var signButton = $('#Sign_Button');
	$('#New_User').on('click', function(){
	
		if(isUp){
			$('#form-signup').css({opacity:0}).slideDown("slow").animate({opacity:1});
			$('.alert').fadeOut();
			$(this).text("Returning User");
			signButton.text("Sign Up");
			isUp = false;
		}else{
			$('#form-signup').animate({opacity:0}).slideUp("slow");
			$('.alert').fadeOut();
			$(this).text("New User");
			signButton.text("Sign in");
			isUp = true;
		}
	});


// main login form //

	$('#login-form').on('submit', function(e) { //use on if jQuery 1.7+
        e.preventDefault(); 

		if(isUp){
			signIn();
		}else{
			signUp();
		}

    });

	function signIn(){
		if(safe && lv.validateForm()){
			safe = false;
			var u = $('#user-tf').val();
			var p = $('#pass-tf').val();
			$.post("/",{user: u, pass: p}).done(function(o){
				safe = true;
				window.location.href = '/home';
			}).fail(function(e){
				safe = true;
				lv.showLoginError('Please check your username and/or password');
			});		
		}
	}

	function signUp(){
		if(safe && av.validateForm()){
			safe = false;
			var u = sanitizeHTML($('#user-tf').val());
			var p = $('#pass-tf').val();
			var e = sanitizeHTML($('#email-tf').val());
			$.post("/signup",{user: u, pass: p, email:e}).done(function(o){
				safe = true;
				window.location.href = o.redirect;
			}).fail(function(e){
				safe = true;
				if (e.responseText == 'email-taken'){
			   		av.showInvalidEmail();
				}	else if (e.responseText == 'username-taken'){
			    	av.showInvalidUserName();
				}

			});		
		}
	}

	$('#user-tf').focus();

// login retrieval form via email //
	
	$("#btn-lostPass").on('click', function(e){  
		$('#lostPasswordModal').modal();
	});

	$("#lostForm").on('submit', function(e){  //Does the same thing as the below function, but allows for enter presses
		$('#lostPasswordModal').modal('hide')
		resetPassword();
	});

	$("#lostPasswordModal #confirmAction").on('click', function(e){  
		resetPassword();
	});

	function resetPassword(){
		var m = $('#emailLost-tf').val();
		if(safe){
			safe = false;
			$.post("/lost-password",{email: m}).done(function(o){
				safe = true;
				lv.showLoginError("Password reset! Check your inbox for your new credentials.");
			}).fail(function(e){
				safe = true;
			   	lv.showLoginError("Sorry, that is not a registered email address.");
			});		
		}
	}

	
	var ev = new EmailValidator();
	
	$('#lostPasswordModal').ajaxForm({
		url: '/lost-password',
		beforeSubmit : function(formData, jqForm, options){
			if (ev.validateEmail($('#email-tf').val())){
				ev.hideEmailAlert();
				return true;
			}	else{
				ev.showEmailAlert("<b> Error!</b> Please enter a valid email address");
				return false;
			}
		},
		success	: function(responseText, status, xhr, $form){
			ev.showEmailSuccess("Check your email on how to reset your password.");
		},
		error : function(){
			ev.showEmailAlert("Sorry. There was a problem, please try again later.");
		}
	});


	//Solution to IE by James Padolsey
	// ----------------------------------------------------------
	// If you're not in IE (or IE version is less than 5) then:
	//     ie === undefined
	// If you're in IE (>5) then you can determine which version:
	//     ie === 7; // IE7
	// Thus, to detect IE:
	//     if (ie) {}
	// And to detect the version:
	//     ie === 6 // IE6
	//     ie> 7 // IE8, IE9 ...
	//     ie <9 // Anything less than IE9
	// ----------------------------------------------------------
	var ie = (function(){
	    var undef, v = 3, div = document.createElement('div');

	    while (
	        div.innerHTML = '<!--[if gt IE '+(++v)+']><i></i><![endif]-->',
	        div.getElementsByTagName('i')[0]
	    );

	    return v> 4 ? v : undef;
	}());

	if(ie <=9)
	{
    	alert('You Are Using An Outdated Browser! This site will not work correctly. Switch To Chrome Or Firefox. :)');   
	}

	
});