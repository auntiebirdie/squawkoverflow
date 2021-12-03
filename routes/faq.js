const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  var faqs = [{
      slug: 'what-is-this',
      question: 'What is this site?',
      answer: `
        <p>SQUAWKoverflow is a simple collecting game where you can have an aviary of your favorite birds!  All you have to do is hatch eggs and decide if you want to keep the bird inside or release it for someone else to add to their own aviary.</p>

        <p>You can engage as much or as little as you like. We have a small community of members who like to gift and trade birds, and there are games on the Discord server you can play to gain friendship with your favorite bird ("Birdy Buddy"). If the social aspect isn't for you, that's fine! Collect all the birds you want and enjoy them however you prefer.</p>
      `
    },
    {
      slug: 'cost-to-play',
      question: 'Is it free to play?',
      answer: `
        <p>You can absolutely play SQUAWKoverflow for free. There are some limitations, which are:</p>
	<ul>
	  <li>You can hatch a new egg once every 10 minutes.</li>
	  <li>You can have up to 11,000 birds in your aviary.</li>
	</ul>
	<p>There is a Patreon where you can pick a support level that matches the playstyle you want.  For $3, you can hatch eggs as much as you want, as often as you want.  For $5, your aviary can contain as many birds as your heart desires. For $10, there are some <a href="#extra-insights">extra insights</a> that become available to you.</p>
	<p>It's completely optional to become a supporter, but it is deeply appreciated! You can support us at <a href="https://patreon.com/squawkoverflow" target="_blank">patreon.com/squawkoverflow</a>.</p>
      `
    },
    {
      slug: 'discord-authentication',
      question: 'Why is authentication through Discord?',
      answer: `
	<p>SQUAWKoverflow started primarily as a complement to a Discord server. This makes the server sort of the central hub - it's where trading and discussion take place, as well as where notifications, update notes, and bug reports go. Rather than implementing our own authentication service, it made sense to leverage Discord since the server and the site are tightly interconnected.</p>

        <p>You do not need to be a member of the server to be a member of the site. Authentication does not grant any personal information or account access. The only information that is exchanged is that you have a Discord account, what your public username is, and your current avatar.</p>
	    `
    },
    {
      slug: 'weird-eggs',
      question: 'What\'s with the weird eggs?',
      answer: `
        <p>You'll likely discover some pretty weird eggs while deciding which to hatch. Much egg? Forked egg? <em>Human egg??</em></p>

        <p>The adjectives for the eggs come from the descriptions of birds on <a href="https://ebird.org">eBird.org</a>. Originally, the plan was to collect all the adjectives, then go through them and do some quality control to ensure the results made sense.</p>

        <p>But then we hatched the perpendicular eggs. We were delighted when we found fluffy, lovelorn, lethargic, and monstrous eggs.</p>

        <p>So we kept them all! Besides, what's the fun in making sense?</p>
      `
    },
    {
      slug: 'flock-management',
      question: 'How do I organize my aviary into flocks?',
      answer: `
        <p>The more birds you get, the more you may want to organize them! You can make as many flocks as you want, and birds can belong to more than one flock.</p>

        <p>In your user dropdown, there is a link to <a href="/flocks" target="_blank">Flocks</a> that will take you to a page with a <a class="btn btn-primary btn-sm">New Flock</a> button, which is how you create new flocks. How you want to name your flocks is completely up to you, and can even include emoji!</p>

        <p>Once you've created a flock (or several), the Manage Flocks page will now have them listed out as separate rows that can be click-and-dragged to reorder them however you like.</p>

        <p>Each one will have a <a class="btn btn-secondary btn-sm">✏️</a> button, which brings up a page to rename it, change the description, delete it, and—most of all!—add and remove birds from the flock.</p>
      `
    },
	  {
	  slug: 'extra-insights',
	  question: 'What are the extra insights available to Bird Fanatics?',
	  answer: `
            <p>Supporting our Patreon at the $10 level gives you extra insights... but what does that mean, exactly?</p>

	    <ul>
	      <li>When hatching eggs, you will see a #x/#y text below the egg. This indicates how many species can hatch from the egg (#y) and how many of them you have in your aviary (#x).</li>
	      <li>When viewing an aviary, you will have more filter options than normal. You can filter to show duplicates in an aviary, any birds that are on your wishlist, or birds you don't have yet when viewing someone else's aviary!</li>
	    </ul>

	    <p>This list may change as new ideas come to light. Feel free to suggest some of your own on the Discord server or <a href="mailto:seppukawaii+ideas@gmail.com">send us an email</a>!</p>
	  `
	  }
  ];

  res.render('faq/index', {
    faqs: faqs
  });
});

module.exports = router;
