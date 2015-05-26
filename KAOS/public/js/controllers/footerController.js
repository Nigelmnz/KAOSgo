function fixAdblockUser() {
	    if (!$('#adSpace').is(':visible')){
	        $("#footer2").css({"margin-top":"-30px"});
	        $("#footer2").css({"height":"30px"});
	        $("#main").css({"padding-bottom":"30px"});
	    }
	}

$(document).ready(function(){
	// fixAdblockUser();
});