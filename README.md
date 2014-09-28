Welcome to Roadli. Worse is better.


To run:  
1) Install meteor (http://meteor.com)  
2) `cd roadli`  
3) `meteor`  

No need for meteorite, just vanilla meteor. Go to 'localhost:5000' in browser to see it.


To deploy:  
`meteor deploy myfunsite`  
...deploys to myfunsite.meteor.com  
`meteor deploy road.li` if you have permission.  

NOTE: The google maps API key is setup to only allow requests with referer road.li. To get things to work locally, add this line to your /etc/hosts file:  
`127.0.0.1 road.li`  
And then use road.li:3000. Or put in your own google api token. 