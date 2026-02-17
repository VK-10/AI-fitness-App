import { CardContent, Grid, Typography } from '@mui/material'
import React, { Activity, useEffect } from 'react'
import { useState } from 'react';
import { useNavigate } from 'react-router';


function ActivityList() {
   const [activities, setactivities] = useState([]);
   const navigate = useNavigate();

   const fetchActivites = async () => {
    try {
      const response = await getActivities();
      setactivities(response.data);

    } catch (error) {
      console.error(error);
    }
   }

   useEffect(() => {
    fetchActivites
   }, [])
  return (
    <Grid conatiner spacing ={2}>
      {activities.map((activity) => (
        <Grid container spacing={{xs: 2, md: 3 }} columns = {{ xs: 4, sm: 8, md: 12}} >
            <Card sx={{cursor: 'pointer'}}
            onClick= {() => navigate(`/activities/${activity.id}`)}>
              <CardContent>
                <Typography variant='h6'>
                  {activity.type}
                </Typography>
                <Typography >
                  {activity.duration}
                </Typography>
                <Typography >
                  {activity.caloriesBurned}
                </Typography>
              </CardContent>

            </Card>
        </Grid>
      ))}

    </Grid>
  )
}

export default ActivityList