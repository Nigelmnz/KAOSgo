var sanitizeHTML = function(string){
	 var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#x27;',
    "/": '&#x2F;'
  };

  return String(string).trim().replace(/[&<>"'\/]/g, function (s) {
    return entityMap[s];
  });
}