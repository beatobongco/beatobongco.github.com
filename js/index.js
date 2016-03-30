// UTIL
function $(q) {
  e = document.querySelectorAll(q)
  if (e.length === 0) {
    return null
  }
  else if (e.length === 1) {
    return e[0]
  }

  return e
}


function getPos(element) {
  // Get the position of current element's class
  var logoOrder = ['insync-logo', 'incorgito-logo', 'beknowntho-logo']
  for (var i=0; i < logoOrder.length; i++) {
    if (element.className.indexOf(logoOrder[i]) > -1) {
      return i
    }
  }
}

// GLOBAL
var prevPos = null
var prevClass = null
// FUNCTIONS
function animateViewer(element) {
  var currPos = null
  if (element) {
    currPos = getPos(element)
    if (currPos > prevPos) {
      prevClass = 'fadeInLeft'
    }
    else if (currPos < prevPos) {
      prevClass = 'fadeInRight'
    }
    else {
      prevClass = 'fadeIn'
    }
  }
  else {
    prevClass = 'fadeIn'
  }
  $('.viewer').classList.remove('fadeOut')
  $('.viewer').classList.add(prevClass)
  prevPos = currPos
}

function bindHoverStates(c) {
  selectors = $(c)
  for (var i=0; i < selectors.length; i++) {
    var el = selectors[i]
    var linkedEl = $("." + el.getAttribute('hover-link'))

    el.addEventListener('mouseover', (function(x, y) {
      $('.viewer').innerHTML = y
      animateViewer(x)
      if (x) {
        x.classList.add('hover')
      }
    }).bind(this, linkedEl, el.getAttribute('hover-description')))

    el.addEventListener('mouseout', (function(x) {
      // $('.viewer').innerHTML = "&nbsp;"
      if (x) {
        x.classList.remove('hover')
      }
      $('.viewer').classList.remove(prevClass)
      $('.viewer').classList.add('fadeOut')
    }).bind(this, linkedEl))

    if (linkedEl) {
      linkedEl.addEventListener('mouseover', (function(x, y, z) {
        $('.viewer').innerHTML = y
        x.classList.add('hover')
        animateViewer(z)
      }).bind(this, el, el.getAttribute('hover-description'), linkedEl))

      linkedEl.addEventListener('mouseout', (function(x) {
        // $('.viewer').innerHTML = "&nbsp;"
        x.classList.remove('hover')
        $('.viewer').classList.remove(prevClass)
        $('.viewer').classList.add('fadeOut')
      }).bind(this, el))
    }
  }
}

bindHoverStates('.main-link')
