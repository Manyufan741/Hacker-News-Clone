$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $favArticles = $('#favorited-articles');
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navSubmit = $("#nav-submit");
  const $navFav = $("#nav-fav");
  const $navMyStories = $('#nav-mystories');
  const $editForm = $("#edit-article-form");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  function loadLocalStorage() {
    for (let li of Array.from($('#all-articles-list .star').parent())) {
      li.firstElementChild.checked = JSON.parse(localStorage.getItem(`${li.id}`))
    }
  }
  //localStorage.setItem(`${evt.target}`, true);
  loadLocalStorage();


  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    console.log("after log in", currentUser);
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    console.log("before log in", currentUser);
    loadLocalStorage();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    loadLocalStorage();
    $allStoriesList.show();
  });

  $navSubmit.on("click", function () {
    if (currentUser) {
      hideElements();
      $submitForm.show();
    }
  })

  $submitForm.on("submit", async function (evt) {
    evt.preventDefault();
    const author = $('#author').val();
    const title = $('#title').val();
    const url = $('#url').val();
    const username = currentUser.username;

    const newStoryList = await storyList.addStory(currentUser, {
      author, title, url, username
    }) //user.ownStories would get updated too but #my-articles won't get updated yet. It will get updated until "My Stories" button is clicked.

    //update HTML with the newStoryList
    $submitForm.hide();
    $allStoriesList.empty();
    await generateStories();
    loadLocalStorage();
    $('#author').val("");
    $('#title').val("");
    $('#url').val("");
    $allStoriesList.show();
    // $('#my-articles').show();

  })

  $navMyStories.on("click", async function () {
    if (currentUser) {
      hideElements();
      await generateMyStories();
      $ownStories.show();
    }
  })

  async function generateMyStories() {
    //to refresh ownStories list
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    currentUser = await User.getLoggedInUser(token, username);
    $ownStories.empty();
    if (currentUser.ownStories.length === 0) {
      $ownStories.append($('<p>No own stories!</p>'));
      return;
    }
    for (let mystory of currentUser.ownStories) {
      $ownStories.append(generateStoryHTML(mystory, true));
    }
    $('#my-articles .thumbs-down').hide();
    $('#my-articles .star').hide();
  }

  //removing user created story
  $('body').on("click", ".obliterate-btn", async function (evt) {
    if (currentUser) {
      let targetStoryId = $(evt.target).parent().parent().attr("id");
      await storyList.deleteStory(currentUser, targetStoryId);
      $(evt.target).parent().parent().remove();
    }
  })

  //update favorite list when clicking checkboxes on the main page
  $('body').on("click", ".star", function (evt) {
    if (currentUser) {
      console.log(evt.target);
      //console.log($(evt.target).parent().attr("id"));
      let targetStoryId = $(evt.target).parent().attr("id");
      if (evt.target.checked) {
        currentUser.addFavorite(targetStoryId);
      } else {
        currentUser.deleteFavorite(targetStoryId);
      }
      //update local starage after clicking the checkboxes
      localStorage.setItem(`${$(evt.target).parent().attr("id")}`, JSON.stringify(evt.target.checked));
    }
  })
  //update favorite list when removing articles from "favorite" page
  $('body').on("click", "#favorited-articles .thumbs-down", function (evt) {
    if (currentUser) {
      let targetStoryId = $(evt.target).parent().attr("id");
      currentUser.deleteFavorite(targetStoryId);
      $(evt.target).parent().remove();
      localStorage.setItem(`${$(evt.target).parent().attr("id")}`, JSON.stringify(false));
    }
  })

  $navFav.on("click", async function () {
    if (currentUser) {
      hideElements();
      await generateFavStories();
      $favArticles.show();
    }
  })

  async function generateFavStories() {
    //to update favorite list
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    currentUser = await User.getLoggedInUser(token, username);

    $favArticles.empty();
    if (currentUser.favorites.length === 0) {
      $favArticles.append($("<p>You don't have favorite stories yet!</p>"));
      return;
    }
    for (let favStory of currentUser.favorites) {
      let result = {}
      if (favStory.username === currentUser.username) {
        result = generateStoryHTML(favStory, true);
      } else {
        result = generateStoryHTML(favStory, false);
      }
      $favArticles.append(result);
    }
    $('#favorited-articles .star').hide();
  }

  //put edit button to work!
  let targetStoryId = 0;
  let editingPage = {};
  $('body').on("click", ".edit-btn", function (evt) {
    $('#edit-article-form').show();
    targetStoryId = $(evt.target).parent().parent().attr("id");
    editingPage = $(evt.target).parent().parent().parent();
  });

  $('body').on("submit", "#edit-article-form", async function (evt) {
    evt.preventDefault();
    let newTitle = $('#edit-title').val();
    await storyList.editStory(currentUser, targetStoryId, newTitle);
    $('#edit-article-form').hide();

    if (editingPage.attr("id") === "favorited-articles") {
      hideElements();
      await generateFavStories();
      $favArticles.show();
    } else if (editingPage.attr("id") === "my-articles") {
      hideElements();
      await generateMyStories();
      $ownStories.show();
    } else {
      hideElements();
      await generateStories();
      $allStoriesList.show();
    }
    loadLocalStorage();

  });



  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  async function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    await generateStories();
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      let result = {};
      if (currentUser) {
        if (story.username === currentUser.username) {
          result = generateStoryHTML(story, true);
        } else {
          result = generateStoryHTML(story, false);
        }
      } else {
        result = generateStoryHTML(story, false);
      }

      $allStoriesList.append(result);
      $('#all-articles-list .thumbs-down').hide();
      $('#user-profile').hide();
    }

    if (!currentUser) {
      $('.star').hide();
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story, myStory) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <input type="checkbox" class="star">
        <button class="thumbs-down fas fa-thumbs-down"></button>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);
    if (myStory) {
      storyMarkup.append($('<small class="edit"><a class="edit-btn">edit</a></small'));
      storyMarkup.append($('<small class="remove-story"><a class="obliterate-btn">delete</a></small'));
    }

    return storyMarkup;
  }



  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $favArticles,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $('.user-links').show();
    $('#nav-welcome').show();
    $('#user-profile').hide();

  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
